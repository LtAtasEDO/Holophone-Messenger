# Holophone/Agent Messenger for use with Cyberpunk RED

A Foundry VTT 12 module for Cyberpunk RED v0.92.1+ that converts the Holophone/Agent Messenger macros into one player- and GM-aware interface.

## Features

- Preserves From/To aliases, multi-recipient messages, emote formatting, public chat, and role-aware whispers.
- Keeps player-to-player eb transfers and GM Charge/Credit controls using the Cyberpunk RED actor ledger, with sender/recipient aliases recorded in each ledger description.
- Keeps the GM directory separated into **Player Characters** and **NPCs** while excluding all Cyberpunk RED `container` actors, including shops, markets, and loot lockers.
- Gives each player a private directory containing only PC/NPC contacts assigned by the GM, recent NPC/alias contacts, and contacts they chose to save. GM assignments synchronize through a world directory so they appear reliably on the separate player client.
- Lets the GM add or remove either a Player Character or NPC contact for one player or all current players without exposing either table's full roster.
- Lets the GM set Corrupted message strength from 0% to 100%.
- Keeps the world-wide 2045 Mode toggle: Agent/red in 2045 and Holophone/cyan in 2077.
- Adds public emergency dispatch cards and GM-configurable response formulas, including service and membership-tier overrides.
- Gives the GM a custom public-network composer: **CitiNet** in 2077 mode and **Ziggurat** in 2045 mode, each with its own styled chat card.
- Uses a recolorable Lucide SVG for alias-only contacts and messages instead of Foundry's blank white mook silhouette or proprietary game artwork.
- Refreshes the 2077 and 2045 windows with a Choom Trade-inspired dark shell, compact section bars, squared controls, and Holophone/Agent-specific secure-link branding.
- Renders ordinary messages as dark, high-contrast direct-message cards in the same visual family as CitiNet/Ziggurat feeds: cyan Holophone cards in 2077 and red Agent cards in 2045.
- Adds a timestamp to every Holophone-generated chat entry. When Simple Calendar is installed and active, the stamp uses its configured in-world date/time; otherwise it uses real local time.

## Chat timestamps

Holophone checks for the active `foundryvtt-simple-calendar` module whenever it creates a chat entry. If available, the module reads Simple Calendar's own formatted current date and time and marks the entry **WORLD TIME**. This applies to ordinary messages, one-time transaction cards, emergency dispatches, public CitiNet/Ziggurat broadcasts, and unavailable-number notices.

If Simple Calendar is absent, disabled, or its API cannot return a formatted time, Holophone continues normally and marks the entry with **LOCAL TIME** using the sender's real clock. Simple Calendar remains optional and requires no Holophone setting.

## Public network broadcasts

The GM-only **Public Network** panel opens a compact composer with an optional headline and a custom message. Posting creates a public styled chat card using the active era:

- **2077 Mode:** CitiNet / Night City Network.
- **2045 Mode:** Ziggurat / Datapool.

Broadcast text is safely escaped before display, preserves line breaks, and never requires a From or To actor.
The CitiNet and Ziggurat network identities are reserved system broadcasters: they never appear in player Recent Contacts or Saved Contacts, even if their names are used as ordinary sender aliases.

## Emergency calls

### R.E.O. Meatwagon

R.E.O. can be called with or without a membership.

- The module reads the caller's active Gear Items in the CPR `carried`, `equipped`, or `owned` states for one food lifestyle and one housing lifestyle.
- If food + housing is **above 800eb/month**, the Holophone call is free.
- Otherwise, **5eb** is deducted from the caller's Cyberpunk RED ledger as `R.E.O. Meatwagon Holophone Call Fee`.
- By default, an active R.E.O. membership uses a `1d6+2` response roll and an uncovered/Cash Call request uses `1d6+3`.
- Membership, Cash Call, transport, and hospital fees are not deducted by this module; they remain governed by the R.E.O. policy Item and the GM.

Lifestyle detection follows Diner™ Manager when it is installed and recognizes a higher valid result from Holophone's compatibility detector when another module stores lifestyles as `owned`. The built-in detector accepts the core food/housing names, decorative prefixes, Datapool Lifestyles naming, monthly amounts in an Item name or description, and conservatively marked custom food/housing lifestyles. The old actor-level lifestyle block is not used because it may be stale.

The GM can enable **Skip lifestyle check** in the Emergency Services panel. While enabled, the module does not inspect food or housing and R.E.O. uses its flat **5eb** call fee. Trauma Team membership gating is unchanged. The choice is saved for the world until the GM turns it off.

### Trauma Team

- The call button activates for an active Gear Item using either the core `Trauma Team` name or the Datapool `Corpo-Care` name. The literal word `Membership` is optional.
- R.E.O. coverage similarly recognizes `REO`, `R.E.O`, `REO Plus`, `REO Meatwagon`, punctuated `R.E.O. Meatwagon`, and `REO Meatsavers` naming.
- A completely custom provider or membership name is supported by entering the Gear Item's exact title as a tier override under the intended service. That exact configured title explicitly opts the Gear Item into R.E.O. or Trauma Team detection.
- The tier is read generically from the Item name, so Silver, Executive, and future tiers work without a code update.
- When several membership Items are active, the highest monthly/market value is used.
- A successful call posts the tier and rolls its configured response time. The default remains `1d6`.

### Configurable response rules

The GM can open **Response Rules** from the Emergency Services panel. The world-level editor accepts standard dice formulas such as `1d6+2` or `2d6` and provides:

- R.E.O. Uncovered / Cash Call formula.
- R.E.O. Membership default formula.
- Optional R.E.O. membership-tier overrides.
- Trauma Team Membership default for future or unmatched tiers.
- Editable Silver and Executive tier overrides, plus additional custom tiers.

Tier matching is case-insensitive and ignores decorative prefixes, the recognized service name, generic words such as `Membership` or `Coverage`, and monthly-price suffixes. This lets entries such as `_Silver Membership`, `Trauma Team Platinum`, `REO Plus`, and `Corpo-Care Gold` resolve to their intended tiers. An exact full Gear title entered in the correct service's tier table also recognizes otherwise unknown custom providers. A matching tier override wins; otherwise the service's membership default is used. **Restore Defaults** returns to the v1.7.1 formulas.

## Installation

> [!CAUTION]
> **Player Character contact access changes in v1.9.0.** Installing v1.9.0 stops automatically showing every Player Character to every player. The GM must use **Manage Player Contacts** to assign the PCs each player should know. Existing NPC contacts, GM-added contacts, Recent Contacts, Saved Contacts, and contacts managed by players are preserved.

1. Extract the ZIP into Foundry's `Data/modules` folder.
2. Confirm the resulting path is `Data/modules/holophone/module.json`.
3. Enable **Holophone/Agent Messenger™** in the world.
4. Reload the world once.

The active GM receives a **Holophone/Agent Messenger™** launcher Macro automatically.
Its icon uses `systems/cyberpunk-red-core/icons/compendium/gear/agent.svg`. Existing official launcher Macros are updated in place when the module starts, preserving their command and hotbar assignment.

Manual launcher command:

```js
return game.holophone.open(typeof args === "undefined" ? null : args);
```

The API also provides:

```js
game.holophone.open();
game.holophone.callREO(actor);
game.holophone.callTrauma(actor);
game.holophone.openResponseRules();
game.holophone.getResponseRules();
game.holophone.resolveResponseFormula("trauma", game.holophone.findTraumaMembership(actor));
game.holophone.openNetworkComposer();
game.holophone.postNetworkBroadcast({ headline: "Headline", message: "Message" });
game.holophone.openContactManager();
game.holophone.grantPlayerContact({ actor, alias: "Wakako", userIds: [userId] });
game.holophone.revokePlayerContact({ actor, userIds: [userId] });
game.holophone.getGMContactDirectory();
game.holophone.inspectLifestyle(actor);
game.holophone.findTraumaMembership(actor);
game.holophone.getChatClock();
```

## Notes

- A real owned From actor is required for transfers and emergency calls. An alias-only sender can still send ordinary messages.
- Entering a From alias uses the module's Lucide unknown-contact SVG in the direct-message card, while a sender using their real actor name keeps their available actor portrait. Existing white mystery-man icons and the removed v1.7.0–1.7.1 WEBP path upgrade automatically.
- The SVG is recolored through CSS to the active era accent: cyan `#00fff7` in 2077 and red `#e64539` in 2045. See `THIRD_PARTY_NOTICES.md` for its source and ISC license.
- A player sees only owned Player Characters in **From**. Their **To** directory contains only GM-assigned PC/NPC contacts plus their own saved and recent contacts; neither the full PC roster nor the full NPC directory is exposed.
- The GM-only **Manage Player Contacts** control has separate NPC and Player Character selectors and can add or remove a contact for one player user or **All Players**. Assigned PCs appear under **Player Characters** and assigned NPCs under **GM Contacts** in the player dropdown and quick search. Open player windows refresh when this world directory changes; v1.9.0-beta.1 GM assignments are migrated automatically.
- Assigned PCs remain usable even when the receiving player has no permission to open that PC's Actor sheet. The directory stores only the contact route needed for messaging, and player-to-player transfer requests are privately delivered to the assigned PC's owners.
- GM-added contacts belong only to the targeted player address books. Players can promote them to **Saved Contacts** or remove them; no other NPC names are exposed.
- When an NPC or alias messages a Player Character, that alias is added only to the owning player's **Recent Contacts**. Players can save recent contacts to their address book or remove recent/saved entries themselves.
- `CitiNet`, `CitiNet Broadcast`, `Ziggurat`, and `Ziggurat Broadcast` are never stored or shown as player contacts. Matching legacy entries are removed automatically after upgrading.
- Alias-only GM senders remain replyable through the GM. If an actor-backed contact is later deleted, attempting to message it posts a private CitiNet/Ziggurat `This number is temporarily unavailable....` status card.
- Wealth ledger descriptions identify the in-character alias: for example, `Holophone Credit (from Wakako)`, `Agent Charge (to Fixer)`, and `Holophone Transfer (received from V)`.
- Cyberpunk RED actors whose type is `container` are never offered as contacts, selected by saved contact preferences, or included by **Add all Player Characters on this Scene**.
- Decorative item prefixes such as `_`, `📆`, or `🏥` are ignored by lifestyle, service, and response-tier matching. Datapool Lifestyles is supported by recognition only and remains entirely optional. For an unrecognized custom emergency provider, add its exact Gear title to the appropriate R.E.O. or Trauma Team tier table.
- Players retain **Whisper to GM**, which whispers the message itself to all GMs.
- GMs receive **Whisper to Player** instead. It delivers the message only to the owners of Player Character actors selected in **To**, while keeping the sending GMs in the whisper. Selecting only NPC recipients produces a warning before the message or any ledger action is processed.
- Private GM-to-player NPC or alias messages still add that sender to the receiving players' recent contacts.
- Transfer deposits sent to another player are delivered as a one-time private Apply button. Applied transaction receipts are recorded on the recipient actor to prevent repeat clicks.

## Legal / Homebrew Content Policy

This is unofficial homebrew content for use with Cyberpunk RED.

This project is provided free of charge under the R. Talsorian Games Homebrew Content Policy.

Holophone/Agent Messenger for use with Cyberpunk RED is unofficial content provided under the Homebrew Content Policy of R. Talsorian Games and is not approved or endorsed by RTG. This content references materials that are the property of R. Talsorian Games and its licensees.

Cyberpunk RED and related properties are the property of R. Talsorian Games and their respective licensees.

## Credits and Asset Notice

Created by Lt Atlas for Cyberpunk RED on Foundry VTT, with development assistance from AI.

The bundled terminal icon uses the human-authored Lucide **Circle User Round** icon under the ISC License and is recolored at runtime for the active Holophone/Agent era for presentation purposes. Full attribution and the license text are included in `THIRD_PARTY_NOTICES.md` in [asset](https://github.com/LtAtasEDO/Holophone-Messenger/tree/main/assets) folder.

This project is unofficial fan tooling and is not affiliated with R. Talsorian Games, Foundry Gaming LLC, or CD PROJEKT RED.
