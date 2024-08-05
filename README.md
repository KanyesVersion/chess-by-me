Chess by me

Issues/To fix:
- The game lags when either king enters check because I use exponentially layered forEach loops. Don't know how to handle legal/illegal move logic without that.
- Kings can currently castle while the square right next to them is attacked.

Missing/To add:
- En passant
- Stalemate
- Abort game/resign
- Rewind moves, see board in previous states
- Click piece -> click square controls, in addition to current drag and drop
- Visual stuff like animations probably

Notes:
- My code uses the term "possible move" for moves that can "physically" be performed by a piece, because it's not blocked, because it's a bishop and the target is in a diagonal, because the target is an empty square, etc.; and "legal move" for moves that involve check logic, so includes moves that get you out of check when you're in check, excludes moves that would put your king in check, etc. This choice is only to help myself organize my logic, even though all these moves are just called "legal" in actual chess terminology.
