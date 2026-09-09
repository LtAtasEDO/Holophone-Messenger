# Changelog

## 1.8.0

- Promoted v1.8.0-beta.1 to stable after successful live GM and player validation.
- Confirmed the refreshed 2077 player and GM interfaces, Response Rules editor, direct-message cards, R.E.O. dispatch, Trauma Team Silver/Executive dispatch, and Simple Calendar world timestamps in Foundry VTT 12.343.
- No functional changes from the validated beta candidate.

## 1.8.0-beta.1

- Started a beta line from the stable v1.7.1 checkpoint for live GM/player validation.
- Removed the proprietary `unknown-contact.webp` asset from the package.
- Added a lightweight Lucide **Circle User Round** SVG under the ISC License, with the complete attribution and license terms in `THIRD_PARTY_NOTICES.md`.
- Recolored the alias SVG at runtime to cyan `#00fff7` in 2077 and red `#e64539` in 2045.
- Migrated saved/recent/GM-added contacts that still reference either Foundry's mystery-man icon or the removed WEBP to the new SVG.
- Refreshed the 2077/2045 windows with a Choom Trade-inspired dark, squared interface while retaining Holophone/Agent secure-link branding and era colors.
- Added a GM-only **Response Rules** editor to Emergency Services.
- Made R.E.O. Uncovered, R.E.O. Membership, and Trauma Team Membership response formulas world-configurable.
- Added optional case-insensitive tier overrides for both R.E.O. and Trauma Team memberships; Silver and Executive ship as editable Trauma Team rows.
- Preserved v1.7.1 response defaults: R.E.O. Membership `1d6+2`, R.E.O. Uncovered `1d6+3`, and Trauma Team `1d6`.
- Added the resolved response formula, rule source, and matched tier to emergency chat flags for auditing.

## 1.7.1

- Changed the official Holophone/Agent Messenger launcher Macro icon from Foundry's generic `sound.svg` to the Cyberpunk RED Agent gear icon.
- Added an automatic startup migration so existing official launcher Macros receive the new icon without being recreated or removed from the hotbar.
- Updated the bundled manual-import Macro JSON to use the same Agent icon.

## 1.7.0

- Added the supplied red/cyan unknown-contact artwork as the module-wide portrait for alias-only contacts and senders.
- Automatically replaces the old white `mystery-man.svg` fallback in existing saved, GM-added, and recent player contacts.
- Restyled ordinary Holophone and Agent messages as dark CitiNet/Ziggurat-family direct-message cards.
- Added an alias portrait, sender, recipient, message status, channel/whisper status, transaction tag, and era-specific footer to direct-message cards.
- Increased the contrast and size of WORLD TIME and LOCAL TIME stamps across all module chat cards.
- Preserved line breaks in ordinary messages.

## 1.6.0

- Added a GM-only **Manage Contacts** workflow for assigning an NPC contact to one player or all current player users.
- Added a player-only **GM Contacts** group above **Recent Contacts** in the To dropdown and quick search.
- Kept the full world NPC directory hidden from players; only the explicitly assigned NPC alias and contact route are added.
- Let players save GM-added entries into **Saved Contacts** or remove them from their private address books.
- Added live player-directory refresh when a GM grants a contact while the player's Messenger window is already open.
- Kept Player Characters and container actors out of the GM contact-assignment picker.

## 1.5.0

- Replaced the GM-side **Whisper to GM** option with **Whisper to Player**.
- GM whispers are delivered only to the owners of Player Character actors selected in **To**, plus the sending GMs.
- Added a pre-send warning when a GM enables **Whisper to Player** without selecting a Player Character recipient, preventing partial ledger or message actions.
- Kept **Whisper to GM** unchanged on the player interface.
- Private NPC/alias messages from the GM continue to populate the receiving players' recent contacts.

## 1.4.1

- Reserved CitiNet and Ziggurat network identities so public broadcasts can never become player recent or saved contacts.
- Blocked `CitiNet`, `CitiNet Broadcast`, `Ziggurat`, and `Ziggurat Broadcast` at contact ingestion, loading, and persistence.
- Added automatic upgrade cleanup for matching entries already present in a player's address book.

## 1.4.0

- Added automatic Simple Calendar detection for every Holophone-generated chat entry.
- Added **WORLD TIME** stamps using Simple Calendar's configured in-world date and time when the module is active.
- Added a safe **LOCAL TIME** fallback using real time when Simple Calendar is absent, disabled, or unavailable.
- Applied the clock stamp to messenger posts, transaction requests, R.E.O./Trauma Team dispatches, CitiNet/Ziggurat broadcasts, and unavailable-number notices.
- Exposed `game.holophone.getChatClock()` for diagnostics and integrations.

## 1.3.0

- Shortened the Emergency Services toggle and status text to **Skip lifestyle check**.
- Restricted non-GM actor searches to owned Player Characters in **From**, and Player Characters plus the user's private saved/recent contacts in **To**.
- Added per-player recent NPC/alias contacts without exposing the GM's world NPC directory.
- Added player-controlled **Save to contacts** and **Remove contact** actions.
- Added private CitiNet/Ziggurat unavailable-number cards when an actor-backed contact has been deleted.
- Added GM-relay replies for alias-only contacts.

## 1.2.0

- Added the selected sender and recipient aliases to GM Charge, GM Credit, and player Transfer ledger descriptions in both Holophone and Agent modes.
- Added a GM-controlled, world-persistent **Skip lifestyle check** option to Emergency Services.
- While the check is skipped, R.E.O. bypasses all food/housing inspection and uses the flat 5eb call fee; Trauma Team membership requirements are unchanged.

## 1.1.0

- Excluded every Cyberpunk RED `container` actor from Player Character and NPC contact results, saved selections, and the scene-wide player shortcut.
- Added a GM-only public network composer with an optional headline and custom message.
- Added styled public CitiNet chat cards for 2077 and Ziggurat Datapool chat cards for 2045.
- Added `openNetworkComposer()` and `postNetworkBroadcast()` to the public module API.

## 1.0.1

- Fixed the normal no-argument launcher path crashing in `openMessenger()` when it read `.length` from an uninitialized recipient list.
- Hardened direct, helper-macro, Monk's Active Tile, and malformed legacy launch inputs so they always normalize to a safe sender, recipient list, and message.

## 1.0.0

- Converted Holophone/Agent Messenger™ v2.3.9 into a Foundry VTT 12 module.
- Unified GM and player launch behavior behind `game.holophone.open()`.
- Preserved aliases, multi-recipient messaging, emotes, GM whispers, Charge, Credit, Transfer, and 2045 Mode.
- Added grouped Player Character and NPC contact results.
- Added a GM-selectable Corrupted message percentage.
- Added R.E.O. Meatwagon dispatch, a 5eb call fee, and the food-plus-housing waiver above 800eb/month.
- Added generic R.E.O. and Trauma Team membership detection with future-tier support.
- Added membership-gated Trauma Team dispatch and response rolls.
- Added one-time transfer receipt protection.
