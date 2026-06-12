# Firebase Security Specification (TDD SPEC)

## 1. Data Invariants
- **Profile Integrity**: A profile document under `/profiles/{userId}` belongs to `userId`. Only that authenticated user may write or edit their profile. Users cannot spoof their profile IDs.
- **Score Authenticity**: Scores under `/leaderboard/{scoreId}` can be created by any authenticated user, but the payload's `userId` must equal the authenticated user's UID. Once wrote, leaderboard entries are completely immutable (no updates, no deletes allowed) to prevent high-score hacking.
- **Flight Trajectory Integrity**: Flight ghosts under `/ghosts/{ghostId}` are public so opponents can load them for duels, but can only be created by the owner matching the payload `userId`. They are immutable after creation.
- **Chat Authenticity**: Chat messages under `/chat/{messageId}` can only be posted by the actual signed-in user (`request.auth.uid == request.resource.data.userId`), are immutable, and have messages restricted to 150 characters to prevent spam bloat.

---

## 2. The "Dirty Dozen" Malicious Attacker Payloads
These payloads attempt to exploit access gaps, bypass validation, or hijack user identities. All of them must return `PERMISSION_DENIED`.

1. **Spoofed User Registration**: Attacker attempts to register a profile under someone else's UID path:
   ```json
   POST /profiles/victim_uid { "commanderName": "Pirate", "highScore": 99999, "storyProgress": 5, "createdAt": "server-timestamp", "updatedAt": "server-timestamp" }
   ```
2. **Cheat Profile Update (Score Hack)**: Attacker attempts to update their high score directly in their profile without playing:
   ```json
   PATCH /profiles/attacker_uid { "highScore": 99999999 }
   ```
3. **Cheat Leaderboard Hijack**: Attacker attempts to write a leaderboard record on behalf of a famous pilot:
   ```json
   POST /leaderboard/score_hack_123 { "userId": "victim_uid", "commanderName": "AwesomeViper", "score": 99999999, "stage": 3, "ghostId": "some_ghost", "createdAt": "server-timestamp" }
   ```
4. **Mutated Leaderboard Entry (Posterior Hack)**: Attacker tries to alter their past scores to beat an active challenger:
   ```json
   PATCH /leaderboard/existing_score_id { "score": 99999999 }
   ```
5. **Score Erase Deletion Attack**: Attacker tries to delete an opponent's high score in the leaderboard:
   ```json
   DELETE /leaderboard/opponent_score_id
   ```
6. **Malicious Giant Ghost Inject**: Attacker tries to push a massive 5MB text block into the `ghostFrames` string to inflate storage costs:
   ```json
   POST /ghosts/bloat_gig { "userId": "attacker_uid", "commanderName": "Viper", "score": 100, "ghostFrames": "...extremely_long_junk_string...", "createdAt": "server-timestamp" }
   ```
7. **Ghost Spoofing**: Attacker tries to post a ghost recording belonging to a victim's user ID:
   ```json
   POST /ghosts/fake_ghost { "userId": "victim_uid", "commanderName": "AwesomeViper", "score": 50000, "ghostFrames": "100,0,0;", "createdAt": "server-timestamp" }
   ```
8. **Chat Message Spoofing**: Attacker tries to post a chat message with a different user's identity:
   ```json
   POST /chat/spam_1 { "userId": "victim_uid", "commanderName": "Victim", "message": "I am conceding the game!", "createdAt": "server-timestamp" }
   ```
9. **Chat Modification (Gaslighting)**: Attacker tries to edit another user's chat message to say something offensive:
   ```json
   PATCH /chat/victim_msg_123 { "message": "Malicious altered message" }
   ```
10. **Chat Deletion Spam**: Attacker attempts to clear the global lobby chat by deleting historical records:
    ```json
    DELETE /chat/some_chat_id
    ```
11. **Oversized Message Attack**: Attacker attempts to bypass chat limits by posting an exceptionally long text:
    ```json
    POST /chat/spam_heavy { "userId": "attacker_uid", "commanderName": "M Spam", "message": "...very long spam message of 500 characters...", "createdAt": "server-timestamp" }
    ```
12. **Anonymous Write Sabotage**: A guest without a verified or authenticated account tries to write to the leaderboards:
    ```json
    POST /leaderboard/guest_hack_1 { "userId": "guest", "commanderName": "Guest", "score": 12000, "stage": 1, "ghostId": "none", "createdAt": "server-timestamp" }
    ```

---

## 3. Test Verification Plan
Firestore rules must evaluate incoming client requests and securely reject any payload showing characteristics of the Dirty Dozen. By enforcing:
- ID ownership checks: `request.auth.uid == userId`
- String length checks: `incoming().message.size() <= 150`
- Data Immutability: `allow update: if false;` on immutable collections.
- Strict schema validation: `isValidProfile()`, `isValidLeaderboard()`, `isValidGhost()`, `isValidChat()`.
- Verified Authentication: check that `request.auth != null`.
