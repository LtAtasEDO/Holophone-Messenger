const MODULE_ID = "holophone";
const MODULE_VERSION = "1.9.0";
const PREF_FLAG = "icMessengerPrefs.v2";
const RECEIPT_FLAG = "transactionReceipts";
const PLAYER_CONTACT_FLAG = "playerContactBook.v1";
const GM_CONTACT_DIRECTORY_SETTING = "gmContactDirectory";
const SIMPLE_CALENDAR_MODULE_ID = "foundryvtt-simple-calendar";
const MAX_PLAYER_CONTACTS = 100;
const ERA_2045 = "#e64539";
const ERA_2077 = "#00fff7";
const HOVER = "#ffdd00";
const ALIAS_PORTRAIT = "modules/holophone/assets/unknown-contact.svg";
const LAUNCHER_ICON = "systems/cyberpunk-red-core/icons/compendium/gear/agent.svg";
const REO_CALL_FEE = 5;
const REO_FREE_THRESHOLD = 800;
const DEFAULT_RESPONSE_RULES = {
  reo: {
    uncovered: "1d6+3",
    membership: "1d6+2",
    tiers: []
  },
  trauma: {
    membership: "1d6",
    tiers: [
      { match: "Silver", formula: "1d6" },
      { match: "Executive", formula: "1d6" }
    ]
  }
};
const RESERVED_NETWORK_CONTACT_ALIASES = new Set([
  "citinet",
  "citinet broadcast",
  "ziggurat",
  "ziggurat broadcast"
]);

const FOOD_TIERS = [
  { id: "none", label: "No Paid Food Lifestyle", rank: 0, monthly: 0, aliases: [] },
  { id: "kibble", label: "Kibble", rank: 1, monthly: 100, aliases: ["kibble"] },
  { id: "generic-prepak", label: "Generic Prepak", rank: 2, monthly: 300, aliases: ["generic prepak", "generic pre-pack", "generic prepack"] },
  { id: "good-prepak", label: "Good Prepak", rank: 3, monthly: 600, aliases: ["good prepak", "good pre-pack", "good prepack"] },
  { id: "fresh-food", label: "Fresh Food", rank: 4, monthly: 1500, aliases: ["fresh food"] }
];

const HOUSING_PATTERNS = [
  "living on the street",
  "living in a vehicle",
  "cube hotel",
  "cargo container",
  "studio apartment",
  "two-bedroom apartment",
  "two bedroom apartment",
  "upscale conapt",
  "corporate conapt",
  "beaverville house",
  "beaverville mcmansion",
  "luxury penthouse"
];

const CUSTOM_HOUSING_TERMS = [
  "apartment",
  "conapt",
  "flat",
  "hotel",
  "hostel",
  "motel",
  "penthouse",
  "house",
  "mansion",
  "residence",
  "housing",
  "lodging",
  "street",
  "vehicle",
  "container",
  "studio",
  "loft"
];

const SERVICE_NAME_ALIASES = {
  trauma: ["trauma team", "corpo care"],
  reo: ["reo meatwagon", "reo meatsavers", "meatwagon", "meatsavers", "reo"]
};

const MEMBERSHIP_TIER_NOISE = new Set([
  "membership",
  "memberships",
  "member",
  "members",
  "coverage",
  "plan",
  "policy",
  "service",
  "tier",
  "eb",
  "month",
  "monthly"
]);

let simpleCalendarClockWarningShown = false;

function duplicate(value) {
  return foundry.utils.deepClone(value);
}

function makeId(length = 16) {
  return foundry.utils.randomID(length);
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeServiceText(value = "") {
  return normalize(value).replace(/\br e o\b/g, "reo");
}

function includesNormalizedPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

function normalizedItemText(item) {
  const description = item?.system?.description?.value ?? item?.system?.description ?? "";
  return normalizeServiceText(`${item?.name ?? ""} ${description}`);
}

function stripLeadingDecorators(value = "") {
  return String(value).replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function removeNormalizedPhrase(text, phrase) {
  return ` ${text} `.replaceAll(` ${phrase} `, " ").replace(/\s+/g, " ").trim();
}

function semanticTierKey(value = "") {
  let text = normalizeServiceText(value);
  const aliases = Object.values(SERVICE_NAME_ALIASES).flat().sort((a, b) => b.length - a.length);
  for (const alias of aliases) text = removeNormalizedPhrase(text, alias);
  return text.split(" ")
    .filter((token) => token
      && !MEMBERSHIP_TIER_NOISE.has(token)
      && !/^\d+(?:eb)?$/.test(token))
    .join(" ");
}

function responseTierKey(value = "") {
  return semanticTierKey(value) || normalizeServiceText(value);
}

function tierDisplayLabel(value = "", fallback = "Standard") {
  const key = semanticTierKey(value);
  if (!key) return fallback;
  return key.split(" ").map((word) => {
    if (word === "vip") return "VIP";
    return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  }).join(" ");
}

function isReservedNetworkContactAlias(value = "") {
  return RESERVED_NETWORK_CONTACT_ALIASES.has(normalize(value));
}

function isAliasPortrait(value = "") {
  const portrait = String(value ?? "").trim();
  return !portrait
    || /(^|\/)icons\/svg\/mystery-man\.svg(?:$|[?#])/i.test(portrait)
    || /(^|\/)modules\/holophone\/assets\/unknown-contact\.(?:webp|svg)(?:$|[?#])/i.test(portrait);
}

function contactPortrait(value = "") {
  const portrait = String(value ?? "").trim();
  if (isAliasPortrait(portrait)) return ALIAS_PORTRAIT;
  return portrait;
}

function contactPortraitHTML(value = "", className = "", alt = "") {
  const portrait = contactPortrait(value);
  if (portrait === ALIAS_PORTRAIT) {
    return `<span class="${esc(className)} holophone-alias-avatar" role="img" aria-label="${esc(alt || "Unknown contact")}"></span>`;
  }
  return `<img class="${esc(className)}" src="${esc(portrait)}" alt="${esc(alt)}">`;
}

function aliasPortrait(actor = null, alias = "", forceAlias = false) {
  if (forceAlias || !actor || normalize(alias) !== normalize(actor.name)) return ALIAS_PORTRAIT;
  return contactPortrait(actor.img);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function currentAccent() {
  return game.settings.get(MODULE_ID, "era2045") ? ERA_2045 : ERA_2077;
}

function currentTerm() {
  return game.settings.get(MODULE_ID, "era2045") ? "Agent" : "Holophone";
}

function skipLifestyleChecks() {
  return game.settings.get(MODULE_ID, "skipLifestyleChecks");
}

function validResponseFormula(value) {
  const formula = String(value ?? "").trim();
  if (!formula || formula.length > 64 || !/^[0-9dD+\-*/()\s]+$/.test(formula)) return false;
  try {
    return typeof Roll.validate === "function" ? Boolean(Roll.validate(formula)) : Boolean(new Roll(formula));
  } catch (_error) {
    return false;
  }
}

function responseFormulaOr(value, fallback) {
  const formula = String(value ?? "").trim();
  return validResponseFormula(formula) ? formula : fallback;
}

function normalizeTierRules(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  return source.map((entry) => {
    const match = String(entry?.match ?? "").trim().slice(0, 80);
    const key = responseTierKey(match);
    const formula = String(entry?.formula ?? "").trim();
    if (!key || seen.has(key) || !validResponseFormula(formula)) return null;
    seen.add(key);
    return { match, formula };
  }).filter(Boolean);
}

function normalizeResponseRules(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const defaults = DEFAULT_RESPONSE_RULES;
  return {
    reo: {
      uncovered: responseFormulaOr(source.reo?.uncovered, defaults.reo.uncovered),
      membership: responseFormulaOr(source.reo?.membership, defaults.reo.membership),
      tiers: normalizeTierRules(source.reo?.tiers, defaults.reo.tiers)
    },
    trauma: {
      membership: responseFormulaOr(source.trauma?.membership, defaults.trauma.membership),
      tiers: normalizeTierRules(source.trauma?.tiers, defaults.trauma.tiers)
    }
  };
}

function responseRules() {
  return normalizeResponseRules(game.settings.get(MODULE_ID, "responseRules"));
}

function resolveResponseFormula(service, membership = null) {
  const rules = responseRules();
  const serviceRules = service === "trauma" ? rules.trauma : rules.reo;
  if (service === "reo" && !membership) {
    return { formula: serviceRules.uncovered, source: "uncovered", match: "" };
  }

  const tier = responseTierKey(membership?.tier || membership?.item?.name);
  const itemName = normalizeServiceText(membership?.item?.name);
  const override = [...serviceRules.tiers]
    .sort((a, b) => responseTierKey(b.match).length - responseTierKey(a.match).length)
    .find((entry) => {
      const match = responseTierKey(entry.match);
      const exactItemMatch = itemName && itemName === normalizeServiceText(entry.match);
      return exactItemMatch || (tier && match && (tier === match || tier.includes(match)));
    });
  return override
    ? { formula: override.formula, source: "tier", match: override.match }
    : { formula: serviceRules.membership, source: "membership", match: "" };
}

function networkIdentity(era2045 = game.settings.get(MODULE_ID, "era2045")) {
  return era2045
    ? {
      era: 2045,
      name: "Ziggurat",
      kicker: "ZIGGURAT // DATAPOOL BULLETIN",
      defaultHeadline: "Ziggurat Newsfeed",
      footer: "DATAPOOL PUBLIC FEED // NIGHT CITY"
    }
    : {
      era: 2077,
      name: "CitiNet",
      kicker: "CITINET // NIGHT CITY NETWORK",
      defaultHeadline: "CitiNet Bulletin",
      footer: "PUBLIC DATA FEED // NIGHT CITY"
    };
}

function simpleCalendarIsActive() {
  return Boolean(
    game.modules.get(SIMPLE_CALENDAR_MODULE_ID)?.active
    && globalThis.SimpleCalendar?.api
  );
}

function clockDisplayLabel(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return [value.date, value.time]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" • ");
}

function realTimeClockLabel(timestamp = Date.now()) {
  try {
    return new Intl.DateTimeFormat(game.i18n?.lang || undefined, {
      dateStyle: "medium",
      timeStyle: "medium"
    }).format(new Date(timestamp));
  } catch (_error) {
    return new Date(timestamp).toLocaleString();
  }
}

function currentChatClock() {
  const realTime = Date.now();

  if (simpleCalendarIsActive()) {
    try {
      const api = globalThis.SimpleCalendar.api;
      let label = clockDisplayLabel(api.currentDateTimeDisplay?.());

      if (!label) {
        const current = api.currentDateTime?.() ?? api.getCurrentDate?.();
        if (current) label = clockDisplayLabel(api.formatDateTime?.(current));
      }

      if (label) {
        const rawTimestamp = Number(api.timestamp?.());
        return {
          source: "simple-calendar",
          sourceLabel: "WORLD TIME",
          label,
          realTime,
          calendarTimestamp: Number.isFinite(rawTimestamp) ? rawTimestamp : null
        };
      }
    } catch (error) {
      if (!simpleCalendarClockWarningShown) {
        console.warn(`${MODULE_ID} | Simple Calendar clock lookup failed; using local real time.`, error);
        simpleCalendarClockWarningShown = true;
      }
    }
  }

  return {
    source: "real-time",
    sourceLabel: "LOCAL TIME",
    label: realTimeClockLabel(realTime),
    realTime,
    calendarTimestamp: null
  };
}

function chatClockHTML(clock = currentChatClock()) {
  return `
    <div class="holophone-chat-clock" data-holophone-clock="${esc(clock.source)}">
      <i class="far fa-clock"></i>
      <span class="holophone-chat-clock-source">${esc(clock.sourceLabel)}</span>
      <span>${esc(clock.label)}</span>
    </div>`;
}

function chatClockFlag(clock) {
  return {
    source: clock.source,
    label: clock.label,
    realTime: clock.realTime,
    calendarTimestamp: clock.calendarTimestamp
  };
}

function isContactActor(actor) {
  return Boolean(actor && normalize(actor.type) !== "container");
}

function allActors() {
  return [...game.actors.contents]
    .filter(isContactActor)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function actorById(id) {
  const actor = game.actors.get(id) ?? null;
  return isContactActor(actor) ? actor : null;
}

function actorHasPlayerOwner(actor) {
  return Boolean(actor?.hasPlayerOwner);
}

function playerCharacterActors() {
  return allActors().filter(actorHasPlayerOwner);
}

function ownedPlayerCharacterActors() {
  return playerCharacterActors().filter((actor) => actor.isOwner);
}

function normalizeContactEntry(entry, { directoryAssigned = false } = {}) {
  const alias = String(entry?.alias ?? entry?.name ?? "").trim().slice(0, 120);
  if (!alias || isReservedNetworkContactAlias(alias)) return null;
  const route = entry?.route === "gm" || (!entry?.actorId && !entry?.actorUuid) ? "gm" : "actor";
  const actorId = route === "actor" ? String(entry?.actorId ?? "") : "";
  const actorUuid = route === "actor" ? String(entry?.actorUuid ?? "") : "";
  const fallbackId = actorUuid.split(".").at(-1) ?? "";
  const actor = route === "actor" ? actorById(actorId || fallbackId) : null;
  const actorKind = entry?.actorKind === "pc" || actorHasPlayerOwner(actor)
    ? "pc"
    : entry?.actorKind === "npc" || route === "actor"
      ? "npc"
      : "alias";
  return {
    id: String(entry?.id || makeId(16)),
    alias,
    route,
    actorId,
    actorUuid,
    actorKind,
    ownerUserIds: [...new Set((Array.isArray(entry?.ownerUserIds) ? entry.ownerUserIds : []).map(String).filter(Boolean))],
    img: contactPortrait(entry?.img),
    saved: Boolean(entry?.saved),
    source: entry?.source === "gm" || directoryAssigned ? "gm" : "recent",
    gmAssignmentId: String(entry?.gmAssignmentId || (directoryAssigned ? entry?.id : "") || ""),
    directoryAssigned,
    firstSeenAt: Math.max(0, Number(entry?.firstSeenAt) || Date.now()),
    lastSeenAt: Math.max(0, Number(entry?.lastSeenAt) || Date.now())
  };
}

function contactIdentityKey(entry) {
  return `${entry?.route ?? ""}|${entry?.actorUuid || entry?.actorId || ""}|${normalize(entry?.alias)}`;
}

function rawPlayerContactState(user = game.user) {
  const raw = duplicate(user?.getFlag?.(MODULE_ID, PLAYER_CONTACT_FLAG) ?? {});
  return {
    raw,
    contacts: Array.isArray(raw) ? raw : Array.isArray(raw.contacts) ? raw.contacts : [],
    dismissedGMContactIds: Array.isArray(raw?.dismissedGMContactIds)
      ? raw.dismissedGMContactIds.map(String).filter(Boolean)
      : []
  };
}

function gmContactDirectory(value = game.settings.get(MODULE_ID, GM_CONTACT_DIRECTORY_SETTING)) {
  const source = value && typeof value === "object" ? value : {};
  const users = {};
  for (const [userId, entries] of Object.entries(source.users ?? {})) {
    if (!Array.isArray(entries)) continue;
    users[String(userId)] = entries
      .map((entry) => normalizeContactEntry(entry, { directoryAssigned: true }))
      .filter(Boolean);
  }
  return { version: 1, users };
}

function serializeGMContactDirectory(directory) {
  const users = {};
  for (const [userId, entries] of Object.entries(directory?.users ?? {})) {
    users[userId] = entries.map((entry) => ({
      id: String(entry.id || makeId(16)),
      alias: String(entry.alias ?? "").trim().slice(0, 120),
      route: entry.route === "gm" ? "gm" : "actor",
      actorId: String(entry.actorId ?? ""),
      actorUuid: String(entry.actorUuid ?? ""),
      actorKind: entry.actorKind === "pc" ? "pc" : entry.actorKind === "alias" ? "alias" : "npc",
      ownerUserIds: [...new Set((entry.ownerUserIds ?? []).map(String).filter(Boolean))],
      img: contactPortrait(entry.img),
      saved: false,
      source: "gm",
      firstSeenAt: Math.max(0, Number(entry.firstSeenAt) || Date.now()),
      lastSeenAt: Math.max(0, Number(entry.lastSeenAt) || Date.now())
    })).filter((entry) => entry.alias && !isReservedNetworkContactAlias(entry.alias));
  }
  return { version: 1, users };
}

function playerContactBook(user = game.user) {
  const state = rawPlayerContactState(user);
  const contacts = state.contacts
    .map((entry) => normalizeContactEntry(entry))
    .filter(Boolean);
  const dismissed = new Set(state.dismissedGMContactIds);
  const assignments = gmContactDirectory().users[String(user?.id ?? "")] ?? [];

  for (const assignment of assignments) {
    if (dismissed.has(assignment.gmAssignmentId)) continue;
    const existing = contacts.find((entry) => contactIdentityKey(entry) === contactIdentityKey(assignment));
    if (existing) {
      existing.gmAssignmentId ||= assignment.gmAssignmentId;
      existing.actorKind = assignment.actorKind;
      existing.ownerUserIds = [...new Set([...existing.ownerUserIds, ...assignment.ownerUserIds])];
      continue;
    }
    contacts.push(assignment);
  }

  return { version: 4, contacts, dismissedGMContactIds: [...dismissed] };
}

async function persistPlayerContactBook(user, book) {
  if (!user) return;
  const visibleContacts = [...(book?.contacts ?? [])]
    .filter((entry) => entry?.id
      && String(entry.alias ?? "").trim()
      && !isReservedNetworkContactAlias(entry.alias));
  const personalContacts = visibleContacts
    .filter((entry) => !entry.directoryAssigned || entry.saved)
    .map((entry) => {
      const persisted = { ...entry };
      delete persisted.directoryAssigned;
      return persisted;
    })
    .sort((a, b) => Number(b.saved) - Number(a.saved)
      || Number(b.source === "gm") - Number(a.source === "gm")
      || b.lastSeenAt - a.lastSeenAt);
  const saved = personalContacts.filter((entry) => entry.saved);
  const gmContacts = personalContacts.filter((entry) => !entry.saved && entry.source === "gm");
  const recent = personalContacts.filter((entry) => !entry.saved && entry.source !== "gm").slice(0, MAX_PLAYER_CONTACTS);
  const persisted = [...saved, ...gmContacts, ...recent];
  const dismissedGMContactIds = [...new Set((book?.dismissedGMContactIds ?? []).map(String).filter(Boolean))].slice(-500);
  if (book) {
    book.version = 4;
    book.contacts = visibleContacts;
    book.dismissedGMContactIds = dismissedGMContactIds;
  }
  await user.setFlag(MODULE_ID, PLAYER_CONTACT_FLAG, { version: 4, contacts: persisted, dismissedGMContactIds });
}

function playerOwnersForActors(actors = []) {
  const ownerLevel = (CONST.DOCUMENT_OWNERSHIP_LEVELS ?? CONST.DOCUMENT_PERMISSION_LEVELS).OWNER;
  return game.users.players.filter((user) => actors.some((actor) => actor.testUserPermission?.(user, ownerLevel)));
}

function resolveMessengerWhisperIds({ recipients = [], relayContacts = [], whisper = false, senderIsGM = game.user.isGM } = {}) {
  const gmIds = game.users.contents.filter((user) => user.isGM).map((user) => user.id);
  if (relayContacts.length) return [...new Set([game.user.id, ...gmIds])];
  if (!whisper) return [];
  if (!senderIsGM) return gmIds;
  const playerIds = playerOwnersForActors(recipients.filter(actorHasPlayerOwner)).map((user) => user.id);
  return [...new Set([...gmIds, ...playerIds])];
}

async function rememberIncomingContact({ actor = null, alias = "", recipients = [] } = {}) {
  if (!game.user.isGM || actorHasPlayerOwner(actor)) return;
  const contactAlias = String(alias || actor?.name || "").trim().slice(0, 120);
  if (!contactAlias || isReservedNetworkContactAlias(contactAlias)) return;

  const route = actor ? "actor" : "gm";
  const actorId = route === "actor" ? String(actor.id ?? "") : "";
  const actorUuid = route === "actor" ? String(actor.uuid ?? `Actor.${actorId}`) : "";
  const identityKey = `${route}|${actorUuid}|${normalize(contactAlias)}`;
  const contactImg = aliasPortrait(actor, contactAlias);
  const now = Date.now();

  for (const user of playerOwnersForActors(recipients.filter(actorHasPlayerOwner))) {
    const book = playerContactBook(user);
    let contact = book.contacts.find((entry) => `${entry.route}|${entry.actorUuid}|${normalize(entry.alias)}` === identityKey);
    if (!contact) {
      contact = {
        id: makeId(16),
        alias: contactAlias,
        route,
        actorId,
        actorUuid,
        actorKind: route === "actor" ? "npc" : "alias",
        img: contactImg,
        saved: false,
        source: "recent",
        firstSeenAt: now,
        lastSeenAt: now
      };
      book.contacts.push(contact);
    } else {
      contact.alias = contactAlias;
      contact.actorId = actorId;
      contact.actorUuid = actorUuid;
      contact.actorKind = route === "actor" ? "npc" : "alias";
      contact.img = contactImg;
      contact.lastSeenAt = now;
    }
    await persistPlayerContactBook(user, book);
  }
}

function nonGMPlayerUsers() {
  return [...game.users.contents]
    .filter((user) => !user.isGM)
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

async function grantPlayerContact({ actor = null, alias = "", userIds = [] } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can add contacts to player address books.");
  if (!isContactActor(actor)) {
    return ui.notifications.warn("Choose a real Player Character or NPC contact. Container actors are excluded.");
  }

  const contactAlias = String(alias || actor.name || "").trim().slice(0, 120);
  if (!contactAlias) return ui.notifications.warn("Enter a contact name or alias.");
  if (isReservedNetworkContactAlias(contactAlias)) {
    return ui.notifications.warn("CitiNet and Ziggurat network identities cannot be added as contacts.");
  }

  const requested = new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String).filter(Boolean));
  const targetUsers = nonGMPlayerUsers().filter((user) => requested.has(user.id));
  if (!targetUsers.length) return ui.notifications.warn("Choose one player or All Players.");

  const actorId = String(actor.id ?? "");
  const actorUuid = String(actor.uuid ?? `Actor.${actorId}`);
  const actorKind = actorHasPlayerOwner(actor) ? "pc" : "npc";
  const identityKey = `actor|${actorUuid}|${normalize(contactAlias)}`;
  const contactImg = aliasPortrait(actor, contactAlias);
  const ownerUserIds = actorKind === "pc" ? playerOwnersForActors([actor]).map((user) => user.id) : [];
  const now = Date.now();
  const directory = gmContactDirectory();
  for (const user of targetUsers) {
    const current = directory.users[user.id] ?? [];
    const previous = current.find((entry) => contactIdentityKey(entry) === identityKey);
    directory.users[user.id] = current.filter((entry) => contactIdentityKey(entry) !== identityKey);
    directory.users[user.id].push({
      id: makeId(16),
      alias: contactAlias,
      route: "actor",
      actorId,
      actorUuid,
      actorKind,
      ownerUserIds,
      img: contactImg,
      saved: false,
      source: "gm",
      firstSeenAt: previous?.firstSeenAt ?? now,
      lastSeenAt: now
    });
  }

  await game.settings.set(MODULE_ID, GM_CONTACT_DIRECTORY_SETTING, serializeGMContactDirectory(directory));

  return { actor, alias: contactAlias, users: targetUsers };
}

async function revokePlayerContact({ actor = null, userIds = [] } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can remove GM-added contacts from player address books.");
  if (!isContactActor(actor)) return ui.notifications.warn("Choose a real Player Character or NPC contact first.");

  const requested = new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String).filter(Boolean));
  const targetUsers = nonGMPlayerUsers().filter((user) => requested.has(user.id));
  if (!targetUsers.length) return ui.notifications.warn("Choose one player or All Players.");

  const actorId = String(actor.id ?? "");
  const actorUuid = String(actor.uuid ?? `Actor.${actorId}`);
  const directory = gmContactDirectory();
  let removed = 0;
  for (const user of targetUsers) {
    const assigned = directory.users[user.id] ?? [];
    const remainingAssignments = assigned.filter((entry) => !(entry.route === "actor"
      && (entry.actorUuid === actorUuid || (!entry.actorUuid && entry.actorId === actorId))));
    removed += assigned.length - remainingAssignments.length;
    directory.users[user.id] = remainingAssignments;

    const state = rawPlayerContactState(user);
    const remainingPersonal = state.contacts.filter((entry) => !(entry?.source === "gm"
      && entry?.route === "actor"
      && (String(entry?.actorUuid ?? "") === actorUuid
        || (!entry?.actorUuid && String(entry?.actorId ?? "") === actorId))));
    if (remainingPersonal.length !== state.contacts.length) {
      removed += state.contacts.length - remainingPersonal.length;
      await user.setFlag(MODULE_ID, PLAYER_CONTACT_FLAG, {
        version: 4,
        contacts: remainingPersonal,
        dismissedGMContactIds: state.dismissedGMContactIds
      });
    }
  }

  await game.settings.set(MODULE_ID, GM_CONTACT_DIRECTORY_SETTING, serializeGMContactDirectory(directory));

  return { actor, users: targetUsers, removed };
}

async function migrateLegacyGMContactsToDirectory() {
  if (!game.user.isGM) return false;
  const activeGM = game.users.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return false;

  const directory = gmContactDirectory();
  let changed = false;
  for (const user of nonGMPlayerUsers()) {
    const state = rawPlayerContactState(user);
    const assigned = directory.users[user.id] ?? [];
    for (const rawEntry of state.contacts) {
      if (rawEntry?.source !== "gm") continue;
      const contact = normalizeContactEntry(rawEntry);
      if (!contact || contact.route !== "actor") continue;
      if (assigned.some((entry) => contactIdentityKey(entry) === contactIdentityKey(contact))) continue;
      const actor = actorById(contact.actorId || contact.actorUuid.split(".").at(-1));
      assigned.push({
        ...contact,
        id: makeId(16),
        ownerUserIds: contact.actorKind === "pc" && actor ? playerOwnersForActors([actor]).map((owner) => owner.id) : contact.ownerUserIds,
        saved: false,
        source: "gm",
        firstSeenAt: contact.firstSeenAt,
        lastSeenAt: Date.now()
      });
      changed = true;
    }
    directory.users[user.id] = assigned;
  }

  if (changed) await game.settings.set(MODULE_ID, GM_CONTACT_DIRECTORY_SETTING, serializeGMContactDirectory(directory));
  return changed;
}

async function purgeReservedNetworkContacts() {
  const users = game.user.isGM ? game.users.players : [game.user];
  for (const user of users) {
    const raw = duplicate(user?.getFlag?.(MODULE_ID, PLAYER_CONTACT_FLAG) ?? {});
    const source = Array.isArray(raw) ? raw : Array.isArray(raw.contacts) ? raw.contacts : [];
    const hasReservedContact = source.some((entry) => isReservedNetworkContactAlias(entry?.alias ?? entry?.name));
    if (hasReservedContact) await persistPlayerContactBook(user, playerContactBook(user));
  }
}

async function upgradeLegacyContactPortraits() {
  const users = game.user.isGM ? game.users.players : [game.user];
  for (const user of users) {
    const raw = duplicate(user?.getFlag?.(MODULE_ID, PLAYER_CONTACT_FLAG) ?? {});
    const source = Array.isArray(raw) ? raw : Array.isArray(raw.contacts) ? raw.contacts : [];
    const hasLegacyPortrait = source.some((entry) => contactPortrait(entry?.img) !== String(entry?.img ?? ""));
    if (hasLegacyPortrait) await persistPlayerContactBook(user, playerContactBook(user));
  }
}

function canUseActor(actor) {
  return Boolean(isContactActor(actor) && (game.user.isGM || actor.isOwner));
}

function actorHasWealth(actor) {
  return Number.isFinite(Number(actor?.system?.wealth?.value));
}

function parseMonthlyAmount(name = "") {
  const match = String(name).replaceAll(",", "").match(/(\d+)\s*eb\s*\/\s*month/i);
  return match ? Math.max(0, Number(match[1]) || 0) : null;
}

function itemDescription(item) {
  return String(item?.system?.description?.value ?? item?.system?.description ?? "");
}

function getItemMarketValue(item) {
  const value = item?.system?.price?.market ?? item?.system?.price ?? 0;
  return Math.max(0, Number(value) || 0);
}

function getItemAmount(item) {
  const value = item?.system?.amount;
  if (value === undefined || value === null || value === "") return 1;
  return Math.max(0, Number(value) || 0);
}

function isActiveCarriedGear(item) {
  if (normalize(item?.type) !== "gear" || getItemAmount(item) <= 0) return false;
  const state = normalize(item?.system?.equipped ?? "");
  return !state || state === "equipped" || state === "carried" || state === "owned";
}

function itemMonthlyAmount(item) {
  return parseMonthlyAmount(item?.name)
    ?? parseMonthlyAmount(itemDescription(item))
    ?? getItemMarketValue(item);
}

function cleanLifestyleLabel(value = "") {
  return stripLeadingDecorators(value)
    .replace(/\s*[-–—]?\s*\d[\d,]*\s*eb\s*\/\s*month.*$/i, "")
    .trim() || "Custom Lifestyle";
}

function customFoodRank(amount) {
  const monthly = Math.max(0, Number(amount) || 0);
  return FOOD_TIERS.reduce((rank, tier) => monthly >= tier.monthly ? Math.max(rank, tier.rank) : rank, 1);
}

function isCustomFoodLifestyle(item) {
  const text = normalizedItemText(item);
  return text.includes("lifestyle package")
    || text.includes("food lifestyle")
    || text.includes("meal lifestyle");
}

function itemFoodTier(item) {
  const name = normalizeServiceText(item?.name);
  let best = FOOD_TIERS[0];
  for (const tier of FOOD_TIERS) {
    if (tier.rank <= best.rank) continue;
    if (tier.aliases.some((alias) => name.includes(normalizeServiceText(alias)))) best = tier;
  }
  if (best.rank > 0 || !isCustomFoodLifestyle(item)) return best;
  const monthly = itemMonthlyAmount(item);
  return {
    id: "custom",
    label: cleanLifestyleLabel(item?.name),
    rank: customFoodRank(monthly),
    monthly,
    aliases: []
  };
}

function isHousingLifestyle(item) {
  const name = normalizeServiceText(item?.name);
  if (HOUSING_PATTERNS.some((pattern) => name.includes(normalizeServiceText(pattern)))) return true;

  const description = normalizeServiceText(itemDescription(item));
  const hasHousingTerm = CUSTOM_HOUSING_TERMS.some((term) => name.includes(normalizeServiceText(term)));
  const hasLifestyleMarker = description.includes("housing lifestyle")
    || description.includes("living space")
    || description.includes("sleeps ")
    || normalize(item?.system?.usage) === "always";
  const hasMonthlyValue = parseMonthlyAmount(item?.name) !== null
    || parseMonthlyAmount(itemDescription(item)) !== null
    || getItemMarketValue(item) > 0;
  return hasHousingTerm && (hasLifestyleMarker || hasMonthlyValue);
}

function inspectLifestyleFallback(actor) {
  const foodMatches = [];
  const housingMatches = [];

  for (const item of actor?.items ?? []) {
    if (!isActiveCarriedGear(item)) continue;
    const parsed = parseMonthlyAmount(item.name);
    const tier = itemFoodTier(item);

    if (tier.rank > 0) {
      const monthly = itemMonthlyAmount(item);
      foodMatches.push({ item, tier, amount: parsed ?? (monthly > 0 ? monthly : tier.monthly) });
    }

    if (isHousingLifestyle(item)) {
      housingMatches.push({ item, amount: parsed ?? itemMonthlyAmount(item) });
    }
  }

  foodMatches.sort((a, b) => b.tier.rank - a.tier.rank || b.amount - a.amount);
  housingMatches.sort((a, b) => b.amount - a.amount);

  const food = foodMatches[0] ?? null;
  const housing = housingMatches[0] ?? null;
  const foodMonthly = Math.max(0, Number(food?.amount ?? 0) || 0);
  const housingMonthly = Math.max(0, Number(housing?.amount ?? 0) || 0);

  return {
    foodTier: food?.tier ?? FOOD_TIERS[0],
    foodSource: food?.item?.name ?? "No paid food plan detected",
    foodMonthly,
    housingName: housing?.item?.name ?? "None detected",
    housingMonthly,
    totalMonthly: foodMonthly + housingMonthly,
    source: "Holophone"
  };
}

function inspectLifestyle(actor) {
  const localResult = inspectLifestyleFallback(actor);
  try {
    const dinerResult = game.dinerManager?.inspectLifestyle?.(actor);
    if (dinerResult && Number.isFinite(Number(dinerResult.totalMonthly))) {
      const foodMonthly = Math.max(0, Number(dinerResult.foodTier?.monthly ?? 0) || 0);
      const normalizedDinerResult = {
        ...dinerResult,
        foodMonthly,
        housingMonthly: Math.max(0, Number(dinerResult.housingMonthly ?? 0) || 0),
        totalMonthly: Math.max(0, Number(dinerResult.totalMonthly) || 0),
        source: "Diner Manager"
      };
      return localResult.totalMonthly > normalizedDinerResult.totalMonthly
        ? localResult
        : normalizedDinerResult;
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Diner lifestyle lookup failed; using local detection.`, error);
  }
  return localResult;
}

function membershipCandidates(actor, service) {
  const serviceKey = service === "trauma" ? "trauma" : "reo";
  const aliases = SERVICE_NAME_ALIASES[serviceKey];
  const exactConfiguredNames = new Set(responseRules()[serviceKey].tiers.map((entry) => normalizeServiceText(entry.match)));
  return [...(actor?.items ?? [])]
    .filter((item) => {
      if (!isActiveCarriedGear(item)) return false;
      const name = normalizeServiceText(item.name);
      return aliases.some((alias) => includesNormalizedPhrase(name, alias))
        || exactConfiguredNames.has(name);
    })
    .sort((a, b) => {
      const monthlyA = itemMonthlyAmount(a);
      const monthlyB = itemMonthlyAmount(b);
      return monthlyB - monthlyA || a.name.localeCompare(b.name);
    });
}

function membershipTier(item, service) {
  if (!item) return "None";
  const raw = stripLeadingDecorators(item.name);
  const colonMatch = raw.match(/membership\s*:\s*([^\-–—]+?)(?:\s*[\-–—]|$)/i);
  if (colonMatch?.[1]?.trim()) return tierDisplayLabel(colonMatch[1], service === "reo" ? "Standard" : "Membership");
  return tierDisplayLabel(raw, service === "reo" ? "Standard" : "Membership");
}

function findMembership(actor, service) {
  const item = membershipCandidates(actor, service)[0] ?? null;
  return item ? {
    item,
    tier: membershipTier(item, service),
    monthly: itemMonthlyAmount(item)
  } : null;
}

function garble(text, ratio = 0.5) {
  const junk = "*%^?!#.,";
  return [...String(text)].map((character) => {
    if (/\s/.test(character) || Math.random() >= ratio) return character;
    return junk[Math.floor(Math.random() * junk.length)];
  }).join("");
}

async function adjustWealthRaw(actor, delta, reason = "Messenger Transaction", receiptId = null) {
  if (!actorHasWealth(actor)) throw new Error(`${actor?.name ?? "Actor"} does not have a Cyberpunk RED ledger.`);

  const wealth = duplicate(actor.system.wealth ?? {});
  const before = Number(wealth.value ?? 0) || 0;
  const change = Math.trunc(Number(delta) || 0);
  wealth.value = before + change;
  wealth.transactions ??= [];
  wealth.transactions.push([
    `${change >= 0 ? "Increased" : "Decreased"} by ${Math.abs(change)} to ${wealth.value}`,
    reason
  ]);

  const update = { "system.wealth": wealth };
  if (receiptId) {
    const receipts = duplicate(actor.getFlag(MODULE_ID, RECEIPT_FLAG) ?? {});
    if (receipts[receiptId]) return false;
    receipts[receiptId] = Date.now();
    const recent = Object.entries(receipts).sort((a, b) => b[1] - a[1]).slice(0, 250);
    update[`flags.${MODULE_ID}.${RECEIPT_FLAG}`] = Object.fromEntries(recent);
  }

  await actor.update(update);
  return true;
}

async function postDepositRequest({ actorName, actorUuid, ownerUserIds = [], delta, reason }) {
  const owners = [...new Set(ownerUserIds.map(String).filter(Boolean))];
  if (!owners.length) throw new Error(`No player owner exists for ${actorName}; the transaction could not be delivered.`);
  const receiptId = makeId(24);
  const direction = delta >= 0 ? "Credit" : "Debit";
  const clock = currentChatClock();
  const content = `
    <div class="holophone-chat-card" style="--holophone-accent:${currentAccent()}">
      <div class="holophone-chat-title">Incoming ${esc(currentTerm())} Transaction</div>
      <div><b>${esc(reason)}</b></div>
      <div><b>${direction}:</b> ${Math.abs(Math.trunc(delta))}eb</div>
      <button type="button" class="holophone-deposit"><i class="fas fa-coins"></i> Apply to ${esc(actorName)}</button>
      ${chatClockHTML(clock)}
    </div>`;

  await ChatMessage.create({
    whisper: owners,
    content,
    speaker: ChatMessage.getSpeaker({ alias: currentTerm() }),
    flags: {
      [MODULE_ID]: {
        deposit: { receiptId, actorUuid, delta: Math.trunc(delta), reason },
        clock: chatClockFlag(clock)
      }
    }
  });
}

async function createDepositRequest(actor, delta, reason) {
  const ownerLevel = (CONST.DOCUMENT_OWNERSHIP_LEVELS ?? CONST.DOCUMENT_PERMISSION_LEVELS).OWNER;
  const owners = game.users.players.filter((user) => actor.testUserPermission?.(user, ownerLevel));
  return postDepositRequest({
    actorName: actor.name,
    actorUuid: actor.uuid,
    ownerUserIds: owners.map((user) => user.id),
    delta,
    reason
  });
}

async function createRemoteDepositRequest(contact, delta, reason) {
  return postDepositRequest({
    actorName: contact.name,
    actorUuid: contact.actorUuid,
    ownerUserIds: contact.ownerUserIds,
    delta,
    reason
  });
}

async function adjustWealth(actor, delta, reason = "Messenger Transaction") {
  if (game.user.isGM || actor.isOwner) return adjustWealthRaw(actor, delta, reason);
  return createDepositRequest(actor, delta, reason);
}

function bindDepositHandler() {
  if (game._holophoneDepositVersion === MODULE_VERSION) return;

  Hooks.on("renderChatMessage", (message, html) => {
    const root = html?.[0] ?? html;
    const button = root?.querySelector?.(".holophone-deposit");
    if (!button || button.dataset.holophoneBound === "1") return;
    button.dataset.holophoneBound = "1";

    button.addEventListener("click", async () => {
      const deposit = message.getFlag(MODULE_ID, "deposit");
      if (!deposit?.actorUuid || !deposit?.receiptId) return ui.notifications.error("This transaction is missing its ledger data.");

      const actor = await fromUuid(deposit.actorUuid);
      if (!actor?.isOwner) return ui.notifications.warn("You must own this actor to apply the transaction.");
      if (actor.getFlag(MODULE_ID, RECEIPT_FLAG)?.[deposit.receiptId]) {
        button.disabled = true;
        button.textContent = "Already Applied";
        return ui.notifications.info("This transaction was already applied.");
      }

      button.disabled = true;
      try {
        const applied = await adjustWealthRaw(actor, deposit.delta, deposit.reason, deposit.receiptId);
        button.textContent = applied ? "Applied" : "Already Applied";
        ui.notifications.info(applied ? "Transaction applied." : "This transaction was already applied.");
      } catch (error) {
        console.error(`${MODULE_ID} | Deposit failed`, error);
        button.disabled = false;
        ui.notifications.error(error.message ?? "The transaction could not be applied.");
      }
    });
  });

  game._holophoneDepositVersion = MODULE_VERSION;
}

function emergencySpeaker(actor) {
  const tokenDoc = actor?.getActiveTokens?.()[0]?.document ?? null;
  return ChatMessage.getSpeaker({
    scene: canvas.scene,
    actor,
    token: tokenDoc ?? undefined,
    alias: actor?.name ?? currentTerm()
  });
}

function emergencyCard({ service, actor, coverage, eta, formula, feeText, details = "", clock = currentChatClock() }) {
  const location = canvas.scene?.name ?? "Unknown location";
  return `
    <div class="holophone-chat-card holophone-emergency-card" style="--holophone-accent:${currentAccent()}">
      <div class="holophone-chat-kicker">EMERGENCY DISPATCH REQUEST</div>
      <div class="holophone-chat-title">${esc(service)}</div>
      <div class="holophone-chat-grid">
        <span>Caller</span><b>${esc(actor.name)}</b>
        <span>Location</span><b>${esc(location)}</b>
        <span>Coverage</span><b>${esc(coverage)}</b>
        <span>Response</span><b>${eta} Rounds (${esc(formula)})</b>
        ${feeText ? `<span>Call Fee</span><b>${esc(feeText)}</b>` : ""}
      </div>
      ${details ? `<div class="holophone-chat-note">${esc(details)}</div>` : ""}
      ${chatClockHTML(clock)}
    </div>`;
}

function networkCard({ headline = "", message = "", era2045 = game.settings.get(MODULE_ID, "era2045"), clock = currentChatClock() }) {
  const identity = networkIdentity(era2045);
  const safeMessage = esc(message).replace(/\r\n|\r|\n/g, "<br>");
  return `
    <div class="holophone-chat-card holophone-network-card" style="--holophone-accent:${era2045 ? ERA_2045 : ERA_2077}">
      <div class="holophone-network-scanline"></div>
      <div class="holophone-chat-kicker"><i class="fas fa-tower-broadcast"></i> ${esc(identity.kicker)}</div>
      <div class="holophone-chat-title">${esc(String(headline).trim() || identity.defaultHeadline)}</div>
      <div class="holophone-network-body">${safeMessage}</div>
      ${chatClockHTML(clock)}
      <div class="holophone-network-footer">${esc(identity.footer)}</div>
    </div>`;
}

function messengerChannelLabel(mode = "public") {
  if (mode === "players") return "WHISPER TO PLAYER";
  if (mode === "gm") return "WHISPER TO GM";
  if (mode === "gm-relay") return "GM RELAY";
  return "PUBLIC CHANNEL";
}

function messengerCard({
  senderAlias = "Unknown",
  recipientText = "Unknown",
  body = "",
  status = "Message",
  transaction = "",
  whisperMode = "public",
  portrait = ALIAS_PORTRAIT,
  era2045 = game.settings.get(MODULE_ID, "era2045"),
  clock = currentChatClock()
} = {}) {
  const term = era2045 ? "Agent" : "Holophone";
  const accent = era2045 ? ERA_2045 : ERA_2077;
  const footer = era2045 ? "AGENT DIRECT FEED // NIGHT CITY" : "HOLOPHONE DIRECT FEED // NIGHT CITY";
  return `
    <div class="holophone-chat-card holophone-network-card holophone-message-card" style="--holophone-accent:${accent}">
      <div class="holophone-network-scanline"></div>
      <div class="holophone-chat-kicker"><i class="fas fa-comment-dots"></i> ${esc(term.toUpperCase())} // DIRECT MESSAGE</div>
      <div class="holophone-message-heading">
        ${contactPortraitHTML(portrait, "holophone-message-avatar", `${senderAlias} contact portrait`)}
        <div class="holophone-message-heading-text">
          <div class="holophone-chat-title">${esc(senderAlias)}</div>
          <div class="holophone-message-route"><span>TO //</span> ${esc(recipientText)}</div>
        </div>
      </div>
      <div class="holophone-message-tags">
        <span class="holophone-message-tag">${esc(status)}</span>
        <span class="holophone-message-tag ${whisperMode === "public" ? "" : "is-private"}">${esc(messengerChannelLabel(whisperMode))}</span>
        ${String(transaction).trim() ? `<span class="holophone-message-tag is-transaction">${esc(String(transaction).trim())}</span>` : ""}
      </div>
      <div class="holophone-network-body holophone-message-body">${body}</div>
      ${chatClockHTML(clock)}
      <div class="holophone-network-footer">${esc(footer)}</div>
    </div>`;
}

async function postUnavailableNumber(contacts = []) {
  const era2045 = game.settings.get(MODULE_ID, "era2045");
  const identity = networkIdentity(era2045);
  const names = contacts.map((entry) => entry?.name).filter(Boolean);
  const gmIds = game.users.contents.filter((user) => user.isGM).map((user) => user.id);
  const whisper = [...new Set([game.user.id, ...gmIds])];
  const clock = currentChatClock();

  await ChatMessage.create({
    content: networkCard({
      headline: `${identity.name} Connection Status`,
      message: "This number is temporarily unavailable....",
      era2045,
      clock
    }),
    speaker: ChatMessage.getSpeaker({ scene: canvas.scene, alias: identity.name }),
    type: CONST.CHAT_MESSAGE_TYPES.OOC,
    whisper,
    flags: {
      [MODULE_ID]: {
        unavailableNumber: {
          network: identity.name,
          contacts: names
        },
        clock: chatClockFlag(clock)
      }
    }
  });
  return true;
}

async function postNetworkBroadcast({ headline = "", message = "" } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can post an official public network broadcast.");
  const body = String(message ?? "").trim();
  if (!body) return ui.notifications.warn("Write a public network message first.");

  const era2045 = game.settings.get(MODULE_ID, "era2045");
  const identity = networkIdentity(era2045);
  const clock = currentChatClock();
  await ChatMessage.create({
    content: networkCard({ headline, message: body, era2045, clock }),
    speaker: ChatMessage.getSpeaker({ scene: canvas.scene, alias: identity.name }),
    type: CONST.CHAT_MESSAGE_TYPES.OOC,
    flags: {
      [MODULE_ID]: {
        networkBroadcast: {
          era: identity.era,
          network: identity.name,
          headline: String(headline ?? "").trim() || identity.defaultHeadline
        },
        clock: chatClockFlag(clock)
      }
    }
  });
  ui.notifications.info(`${identity.name} broadcast posted.`);
  return true;
}

async function openNetworkComposer() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can post an official public network broadcast.");

  const identity = networkIdentity();
  const content = `
    <div class="holophone-shell holophone-network-shell">
      <div class="holophone-header">
        <div class="holophone-logo"><i class="fas fa-tower-broadcast"></i></div>
        <div class="holophone-brand-copy">
          <div class="holophone-brand-kicker">PUBLIC NETWORK // BROADCAST UPLINK</div>
          <div class="holophone-title holophone-network-composer-title">${esc(identity.name)} Broadcast</div>
          <div class="holophone-subtitle">Post a styled public message to the chat log.</div>
        </div>
        <div class="holophone-mode-chip" data-era-label>${identity.era} FEED</div>
      </div>
      <div class="holophone-card">
        <div class="holophone-label">Headline <span class="holophone-muted">(optional)</span></div>
        <input type="text" class="holophone-broadcast-headline" placeholder="${esc(identity.defaultHeadline)}">
      </div>
      <div class="holophone-card">
        <div class="holophone-label holophone-network-message-label">${esc(identity.name)} Message</div>
        <textarea class="holophone-broadcast-message" placeholder="Type the public broadcast…"></textarea>
      </div>
      <button type="button" class="holophone-btn holophone-send holophone-post-network">
        <i class="fas fa-tower-broadcast"></i> Post to ${esc(identity.name)}
      </button>
      <div class="holophone-muted holophone-tip">This posts publicly. Ctrl/Cmd + Enter also posts.</div>
    </div>`;

  let dialog = null;
  let busy = false;
  let eraHook = null;
  dialog = new Dialog({
    title: `Compose ${identity.name} Broadcast`,
    content,
    buttons: {},
    render: (html) => {
      const app = html[0].closest(".app");
      applyDialogTheme(app, undefined, "network");
      const root = html[0].querySelector(".holophone-network-shell");
      const headline = root.querySelector(".holophone-broadcast-headline");
      const message = root.querySelector(".holophone-broadcast-message");
      const postButton = root.querySelector(".holophone-post-network");
      const composerTitle = root.querySelector(".holophone-network-composer-title");
      const messageLabel = root.querySelector(".holophone-network-message-label");

      const updateComposerEra = (era2045) => {
        const current = networkIdentity(Boolean(era2045));
        applyDialogTheme(app, Boolean(era2045), "network");
        composerTitle.textContent = `${current.name} Broadcast`;
        messageLabel.textContent = `${current.name} Message`;
        headline.placeholder = current.defaultHeadline;
        postButton.innerHTML = `<i class="fas fa-tower-broadcast"></i> Post to ${esc(current.name)}`;
      };

      const post = async () => {
        if (busy) return;
        busy = true;
        postButton.disabled = true;
        try {
          const posted = await postNetworkBroadcast({ headline: headline.value, message: message.value });
          if (posted) dialog.close();
        } catch (error) {
          console.error(`${MODULE_ID} | Network broadcast failed`, error);
          ui.notifications.error(error.message ?? "The public network broadcast failed.");
        } finally {
          busy = false;
          postButton.disabled = false;
        }
      };

      postButton.addEventListener("click", post);
      message.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") post();
      });
      eraHook = (value) => updateComposerEra(Boolean(value));
      Hooks.on("holophone-era2045-changed", eraHook);
      message.focus();
    },
    close: () => {
      if (eraHook) Hooks.off("holophone-era2045-changed", eraHook);
    }
  }, { width: 560, height: "auto", resizable: true });

  dialog.render(true);
  return dialog;
}

function tierRuleRowHTML(service, entry = {}) {
  return `
    <div class="holophone-tier-rule" data-service="${esc(service)}">
      <input type="text" class="holophone-tier-match" maxlength="80" placeholder="Tier name contains…" value="${esc(entry.match ?? "")}">
      <input type="text" class="holophone-tier-formula" maxlength="64" placeholder="1d6+2 or 2d6" value="${esc(entry.formula ?? "1d6")}">
      <button type="button" class="holophone-contact-action holophone-remove-tier" title="Remove tier override" aria-label="Remove tier override">
        <i class="fas fa-trash"></i>
      </button>
    </div>`;
}

function responseRulesFromDialog(root) {
  const readFormula = (selector, label) => {
    const formula = String(root.querySelector(selector)?.value ?? "").trim();
    if (!validResponseFormula(formula)) throw new Error(`${label} must be a valid dice formula such as 1d6+2 or 2d6.`);
    return formula;
  };
  const readTiers = (service) => {
    const seen = new Set();
    return [...root.querySelectorAll(`.holophone-tier-rule[data-service="${service}"]`)].map((row) => {
      const match = String(row.querySelector(".holophone-tier-match")?.value ?? "").trim();
      const formula = String(row.querySelector(".holophone-tier-formula")?.value ?? "").trim();
      if (!match) throw new Error(`${service === "trauma" ? "Trauma Team" : "R.E.O."} tier overrides need a tier name.`);
      const key = responseTierKey(match);
      if (seen.has(key)) throw new Error(`The tier override “${match}” appears more than once.`);
      if (!validResponseFormula(formula)) throw new Error(`${match} must use a valid dice formula such as 1d6+2 or 2d6.`);
      seen.add(key);
      return { match: match.slice(0, 80), formula };
    });
  };

  return {
    reo: {
      uncovered: readFormula(".holophone-reo-uncovered-formula", "R.E.O. Uncovered / Cash Call"),
      membership: readFormula(".holophone-reo-membership-formula", "R.E.O. Membership Default"),
      tiers: readTiers("reo")
    },
    trauma: {
      membership: readFormula(".holophone-trauma-membership-formula", "Trauma Team Membership Default"),
      tiers: readTiers("trauma")
    }
  };
}

async function openResponseRules() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can configure emergency response rolls.");
  const rules = responseRules();
  const content = `
    <div class="holophone-shell holophone-rules-shell">
      <div class="holophone-header">
        <div class="holophone-logo"><i class="fas fa-dice"></i></div>
        <div class="holophone-brand-copy">
          <div class="holophone-brand-kicker">DISPATCH CONTROL // WORLD RULES</div>
          <div class="holophone-title">Emergency Response Rules</div>
          <div class="holophone-subtitle">Set any standard dice formula, including 1d6 + a modifier or 2d6.</div>
        </div>
        <div class="holophone-mode-chip">GM ONLY</div>
      </div>

      <div class="holophone-card holophone-rule-card">
        <div class="holophone-section-title">R.E.O. Meatwagon</div>
        <div class="holophone-rule-basics">
          <label class="holophone-field">
            <span class="holophone-label">Uncovered / Cash Call</span>
            <input type="text" class="holophone-reo-uncovered-formula" maxlength="64" value="${esc(rules.reo.uncovered)}">
          </label>
          <label class="holophone-field">
            <span class="holophone-label">Membership Default</span>
            <input type="text" class="holophone-reo-membership-formula" maxlength="64" value="${esc(rules.reo.membership)}">
          </label>
        </div>
        <div class="holophone-tier-heading">
          <span>Optional Tier Overrides</span>
          <button type="button" class="holophone-btn holophone-add-tier" data-service="reo"><i class="fas fa-plus"></i> Add R.E.O. Tier</button>
        </div>
        <div class="holophone-tier-columns"><span>Tier name contains</span><span>Response formula</span><span></span></div>
        <div class="holophone-tier-list" data-service="reo">${rules.reo.tiers.map((entry) => tierRuleRowHTML("reo", entry)).join("")}</div>
        <div class="holophone-muted">A matching tier overrides the membership default. Uncovered callers always use the Cash Call formula.</div>
      </div>

      <div class="holophone-card holophone-rule-card">
        <div class="holophone-section-title">Trauma Team</div>
        <div class="holophone-rule-basics holophone-rule-basics-single">
          <label class="holophone-field">
            <span class="holophone-label">Membership Default / Future Tiers</span>
            <input type="text" class="holophone-trauma-membership-formula" maxlength="64" value="${esc(rules.trauma.membership)}">
          </label>
        </div>
        <div class="holophone-tier-heading">
          <span>Tier Overrides</span>
          <button type="button" class="holophone-btn holophone-add-tier" data-service="trauma"><i class="fas fa-plus"></i> Add Trauma Tier</button>
        </div>
        <div class="holophone-tier-columns"><span>Tier name contains</span><span>Response formula</span><span></span></div>
        <div class="holophone-tier-list" data-service="trauma">${rules.trauma.tiers.map((entry) => tierRuleRowHTML("trauma", entry)).join("")}</div>
        <div class="holophone-muted">Silver and Executive begin at 1d6 to preserve v1.7.1 behavior. Add or rename rows for any future membership tier.</div>
      </div>

      <div class="holophone-rule-actions">
        <button type="button" class="holophone-btn holophone-reset-response"><i class="fas fa-rotate-left"></i> Restore Defaults</button>
        <button type="button" class="holophone-btn holophone-send holophone-save-response"><i class="fas fa-floppy-disk"></i> Save Response Rules</button>
      </div>
      <div class="holophone-muted holophone-tip">Tier matching is case-insensitive and uses the membership name detected on the caller.</div>
    </div>`;

  let dialog = null;
  let busy = false;
  dialog = new Dialog({
    title: "Emergency Response Rules",
    content,
    buttons: {},
    render: (html) => {
      const app = html[0].closest(".app");
      applyDialogTheme(app, undefined, "rules");
      const root = html[0].querySelector(".holophone-rules-shell");
      const saveButton = root.querySelector(".holophone-save-response");
      const resetButton = root.querySelector(".holophone-reset-response");

      root.addEventListener("click", async (event) => {
        const addButton = event.target.closest(".holophone-add-tier");
        if (addButton) {
          const service = addButton.dataset.service;
          root.querySelector(`.holophone-tier-list[data-service="${service}"]`)
            ?.insertAdjacentHTML("beforeend", tierRuleRowHTML(service));
          return;
        }
        const removeButton = event.target.closest(".holophone-remove-tier");
        if (removeButton) removeButton.closest(".holophone-tier-rule")?.remove();
      });

      const save = async () => {
        if (busy) return;
        busy = true;
        saveButton.disabled = true;
        try {
          const next = responseRulesFromDialog(root);
          await game.settings.set(MODULE_ID, "responseRules", next);
          ui.notifications.info("Emergency response rules saved.");
          dialog.close();
        } catch (error) {
          ui.notifications.warn(error.message ?? "The response rules could not be saved.");
        } finally {
          busy = false;
          saveButton.disabled = false;
        }
      };

      saveButton.addEventListener("click", save);
      resetButton.addEventListener("click", async () => {
        const confirmed = await Dialog.confirm({
          title: "Restore Emergency Response Defaults?",
          content: "<p>This restores the v1.7.1 response formulas and the Silver/Executive tier rows.</p>",
          yes: () => true,
          no: () => false,
          defaultYes: false
        });
        if (!confirmed) return;
        await game.settings.set(MODULE_ID, "responseRules", duplicate(DEFAULT_RESPONSE_RULES));
        ui.notifications.info("Emergency response defaults restored.");
        dialog.close();
      });
      root.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") save();
      });
    }
  }, { width: 700, height: "auto", resizable: true });

  dialog.render(true);
  return dialog;
}

async function callREO(actor) {
  if (!actor) return ui.notifications.warn("Select a real caller in From first.");
  if (!canUseActor(actor)) return ui.notifications.warn(`You must own ${actor.name} to place this call.`);

  const lifestyleSkipped = skipLifestyleChecks();
  const lifestyle = lifestyleSkipped ? null : inspectLifestyle(actor);
  const lifestyleTotal = lifestyle?.totalMonthly ?? null;
  const waived = !lifestyleSkipped && lifestyleTotal > REO_FREE_THRESHOLD;
  if (!waived && !actorHasWealth(actor)) return ui.notifications.warn(`${actor.name} does not have a Cyberpunk RED ledger for the 5eb call fee.`);

  const membership = findMembership(actor, "reo");
  const coverage = membership ? `${membership.tier} Membership` : "Uncovered / Cash Call";
  const response = resolveResponseFormula("reo", membership);
  const formula = response.formula;
  const feeText = waived
    ? `Waived — food + housing ${lifestyleTotal}eb/month`
    : lifestyleSkipped
      ? `${REO_CALL_FEE}eb deducted — lifestyle check disabled`
      : `${REO_CALL_FEE}eb deducted`;

  const confirmed = await Dialog.confirm({
    title: "Call R.E.O. Meatwagon?",
    content: `
      <div class="holophone-confirm">
        <p><b>Caller:</b> ${esc(actor.name)}</p>
        <p><b>Coverage:</b> ${esc(coverage)}</p>
        <p><b>Response:</b> ${esc(formula)} Rounds</p>
        ${lifestyleSkipped
          ? `<p><b>Lifestyle check:</b> Disabled by GM</p>`
          : `<p><b>Food + housing:</b> ${lifestyleTotal}eb/month</p>`}
        <p><b>Holophone call fee:</b> ${waived ? "Free" : `${REO_CALL_FEE}eb`}</p>
        <p class="holophone-muted">Membership, Cash Call, transport, and treatment charges remain governed by the R.E.O. policy terms.</p>
      </div>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
  if (!confirmed) return false;

  if (!waived) await adjustWealthRaw(actor, -REO_CALL_FEE, "R.E.O. Meatwagon Holophone Call Fee");
  const roll = await new Roll(formula).evaluate();
  const clock = currentChatClock();
  await ChatMessage.create({
    content: emergencyCard({
      service: "R.E.O. Meatwagon Inc.",
      actor,
      coverage,
      eta: roll.total,
      formula,
      feeText,
      details: "Dispatch accepted. Membership/Cash Call service billing is handled separately under the active policy terms.",
      clock
    }),
    speaker: emergencySpeaker(actor),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rolls: [roll],
    flags: {
      [MODULE_ID]: {
        emergency: {
          service: "reo",
          actorUuid: actor.uuid,
          membershipUuid: membership?.item?.uuid ?? "",
          membershipTier: membership?.tier ?? "",
          formula,
          responseRule: response.source,
          responseTierMatch: response.match,
          waived,
          lifestyle: lifestyleTotal,
          lifestyleCheckSkipped: lifestyleSkipped
        },
        clock: chatClockFlag(clock)
      }
    }
  });
  ui.notifications.info(`R.E.O. Meatwagon dispatch requested for ${actor.name}.`);
  return true;
}

async function callTrauma(actor) {
  if (!actor) return ui.notifications.warn("Select a real caller in From first.");
  if (!canUseActor(actor)) return ui.notifications.warn(`You must own ${actor.name} to place this call.`);

  const membership = findMembership(actor, "trauma");
  if (!membership) return ui.notifications.warn(`${actor.name} does not have an active Trauma Team membership.`);
  const response = resolveResponseFormula("trauma", membership);
  const formula = response.formula;

  const confirmed = await Dialog.confirm({
    title: "Call Trauma Team?",
    content: `
      <div class="holophone-confirm">
        <p><b>Caller:</b> ${esc(actor.name)}</p>
        <p><b>Membership:</b> ${esc(membership.tier)}</p>
        <p><b>Response:</b> ${esc(formula)} Rounds</p>
      </div>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
  if (!confirmed) return false;

  const roll = await new Roll(formula).evaluate();
  const clock = currentChatClock();
  await ChatMessage.create({
    content: emergencyCard({
      service: "Trauma Team International",
      actor,
      coverage: `${membership.tier} Membership`,
      eta: roll.total,
      formula,
      feeText: "Covered by active membership",
      details: "Policy authenticated. Trauma Team is inbound.",
      clock
    }),
    speaker: emergencySpeaker(actor),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    rolls: [roll],
    flags: {
      [MODULE_ID]: {
        emergency: {
          service: "trauma",
          actorUuid: actor.uuid,
          membershipUuid: membership.item.uuid,
          membershipTier: membership.tier,
          formula,
          responseRule: response.source,
          responseTierMatch: response.match
        },
        clock: chatClockFlag(clock)
      }
    }
  });
  ui.notifications.info(`Trauma Team dispatch requested for ${actor.name}.`);
  return true;
}

function pickerHTML(label, placeholder, selectedKeys = [], multi = false) {
  return `
    <div class="holophone-field">
      <div class="holophone-label">${esc(label)}</div>
      <div class="holophone-picker" data-picker="${esc(label)}" data-multi="${multi ? "1" : "0"}">
        <input class="holophone-pick-input" type="text" placeholder="${esc(placeholder)}${multi ? " (comma to add)" : ""}">
        <div class="holophone-pick-display" data-keys="${esc(selectedKeys.join(","))}"></div>
        <div class="holophone-pick-menu"></div>
      </div>
    </div>`;
}

function actorPickerEntry(actor) {
  return {
    key: `actor:${actor.id}`,
    kind: "actor",
    actor,
    actorId: actor.id,
    name: actor.name,
    img: actor.img ?? "icons/svg/mystery-man.svg",
    group: actorHasPlayerOwner(actor) ? "PLAYER CHARACTERS" : "NPCS",
    unavailable: false
  };
}

function contactPickerEntry(contact) {
  const fallbackId = String(contact.actorUuid ?? "").split(".").at(-1) ?? "";
  const actor = contact.route === "actor" ? actorById(contact.actorId || fallbackId) : null;
  const actorKind = contact.actorKind === "pc" || actorHasPlayerOwner(actor) ? "pc" : contact.actorKind;
  const ownerUserIds = [...new Set((contact.ownerUserIds ?? []).map(String).filter(Boolean))];
  const remotePlayerContact = !actor && actorKind === "pc" && Boolean(contact.actorUuid) && ownerUserIds.length > 0;
  return {
    key: `contact:${contact.id}`,
    kind: "contact",
    contactId: contact.id,
    route: contact.route,
    actor,
    actorId: actor?.id ?? contact.actorId ?? "",
    actorKind,
    actorUuid: actor?.uuid ?? contact.actorUuid ?? "",
    ownerUserIds,
    remotePlayerContact,
    name: contact.alias,
    img: contactPortrait(contact.img ?? actor?.img),
    group: !contact.saved && contact.source === "gm" && actorKind === "pc"
      ? "PLAYER CHARACTERS"
      : contact.saved
        ? "SAVED CONTACTS"
        : contact.source === "gm"
          ? "GM CONTACTS"
          : "RECENT CONTACTS",
    saved: Boolean(contact.saved),
    source: contact.source === "gm" ? "gm" : "recent",
    unavailable: contact.route === "actor" && !actor && !remotePlayerContact
  };
}

function pickerEntries(kind, contactBook) {
  if (game.user.isGM) return allActors().map(actorPickerEntry);
  const players = (kind === "From" ? ownedPlayerCharacterActors() : []).map(actorPickerEntry);
  if (kind === "From") return players;
  const contacts = [...(contactBook?.contacts ?? [])]
    .sort((a, b) => Number(b.saved) - Number(a.saved)
      || Number(b.source === "gm") - Number(a.source === "gm")
      || b.lastSeenAt - a.lastSeenAt)
    .map(contactPickerEntry);
  return [...players, ...contacts];
}

function groupedPickerMenu(entries, selectedKeys = []) {
  const selected = new Set(selectedKeys);
  const labels = game.user.isGM
    ? ["PLAYER CHARACTERS", "NPCS"]
    : ["PLAYER CHARACTERS", "SAVED CONTACTS", "GM CONTACTS", "RECENT CONTACTS"];

  const group = (label, groupEntries) => {
    if (!groupEntries.length) return "";
    return `
      <div class="holophone-pick-heading">${esc(label)} <span>${groupEntries.length}</span></div>
      ${groupEntries.map((entry) => `
        <div class="holophone-pick-item ${selected.has(entry.key) ? "selected" : ""} ${entry.unavailable ? "unavailable" : ""}"
             data-entry-key="${esc(entry.key)}" role="button" tabindex="0">
          ${contactPortraitHTML(entry.img, "holophone-pick-avatar", `${entry.name} contact portrait`)}
          <span class="holophone-pick-name">
            <b>${esc(entry.name)}</b>
            ${entry.kind === "contact" ? `<small>${entry.saved ? "Saved contact" : entry.source === "gm" ? `${entry.actorKind === "pc" ? "Player Character · " : ""}Added by GM` : "Recent contact"}${entry.unavailable ? " · Unavailable" : ""}</small>` : ""}
          </span>
          <span class="holophone-pick-actions">
            ${entry.kind === "contact" && !entry.saved
              ? `<button type="button" class="holophone-contact-action" data-contact-action="save" title="Save to contacts" aria-label="Save ${esc(entry.name)} to contacts"><i class="fas fa-address-book"></i></button>`
              : ""}
            ${entry.kind === "contact"
              ? `<button type="button" class="holophone-contact-action" data-contact-action="remove" title="Remove contact" aria-label="Remove ${esc(entry.name)}"><i class="fas fa-trash"></i></button>`
              : ""}
            ${selected.has(entry.key) ? '<i class="fas fa-check holophone-pick-check"></i>' : ""}
          </span>
        </div>`).join("")}`;
  };

  return labels.map((label) => group(label, entries.filter((entry) => entry.group === label))).join("")
    || '<div class="holophone-pick-empty">No matching contacts.</div>';
}

function wirePicker(root, label, { onChange = null, contactBook = null, entryProvider = null } = {}) {
  const picker = root.querySelector(`.holophone-picker[data-picker="${label}"]`);
  const multi = picker.dataset.multi === "1";
  const input = picker.querySelector(".holophone-pick-input");
  const display = picker.querySelector(".holophone-pick-display");
  const menu = picker.querySelector(".holophone-pick-menu");
  const selection = new Map();

  const normalizeKey = (key) => String(key).includes(":") ? String(key) : `actor:${key}`;
  const entries = () => entryProvider ? entryProvider() : pickerEntries(label, contactBook);
  const entryByKey = (key) => entries().find((entry) => entry.key === normalizeKey(key)) ?? null;

  for (const rawKey of (display.dataset.keys ?? "").split(",").filter(Boolean)) {
    const entry = entryByKey(rawKey);
    if (entry) selection.set(entry.key, entry);
  }

  const getKeys = () => [...selection.keys()];
  const getEntries = () => getKeys().map((key) => entryByKey(key) ?? selection.get(key)).filter(Boolean);
  const getIds = () => getEntries().map((entry) => entry.actor?.id).filter(Boolean);
  const notify = () => onChange?.(getEntries());

  function renderChips() {
    display.replaceChildren();
    if (!selection.size) {
      const placeholder = document.createElement("span");
      placeholder.className = "holophone-pick-placeholder";
      placeholder.textContent = "Select…";
      display.appendChild(placeholder);
    } else {
      for (const [key, entry] of selection) {
        const chip = document.createElement("span");
        chip.className = `holophone-chip ${entry.unavailable ? "unavailable" : ""}`;
        chip.dataset.entryKey = key;
        chip.innerHTML = `${esc(entry.name)} <button type="button" class="holophone-chip-remove" title="Remove" aria-label="Remove ${esc(entry.name)}">×</button>`;
        display.appendChild(chip);
      }
    }
    display.dataset.keys = getKeys().join(",");
  }

  function renderMenu() {
    const query = normalize(input.value);
    const available = entries();
    const view = query ? available.filter((entry) => normalize(entry.name).includes(query)) : available;
    menu.innerHTML = groupedPickerMenu(view, getKeys());
  }

  function openMenu() {
    renderMenu();
    menu.classList.add("open");
  }

  function closeMenu() {
    menu.classList.remove("open");
  }

  function remove(id) {
    if (!selection.delete(id)) return;
    renderChips();
    renderMenu();
    notify();
  }

  display.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".holophone-chip-remove");
    if (removeButton) {
      event.stopPropagation();
      return remove(removeButton.closest(".holophone-chip")?.dataset.entryKey);
    }
    menu.classList.contains("open") ? closeMenu() : openMenu();
  });

  input.addEventListener("focus", openMenu);
  input.addEventListener("input", () => {
    openMenu();
    if (!multi || !input.value.includes(",")) return;
    const names = input.value.split(",").map((name) => normalize(name)).filter(Boolean);
    for (const name of names) {
      const entry = entries().find((candidate) => normalize(candidate.name) === name);
      if (entry) selection.set(entry.key, entry);
    }
    input.value = "";
    renderChips();
    renderMenu();
    notify();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Backspace" || input.value) return;
    const keys = getKeys();
    if (keys.length) remove(keys.at(-1));
  });

  menu.addEventListener("click", async (event) => {
    const row = event.target.closest(".holophone-pick-item");
    if (!row) return;
    const action = event.target.closest(".holophone-contact-action")?.dataset.contactAction;
    const entry = entryByKey(row.dataset.entryKey);
    if (!entry) return;

    if (action && entry.kind === "contact" && contactBook) {
      const contact = contactBook.contacts.find((candidate) => candidate.id === entry.contactId);
      if (!contact) return;
      if (action === "save") contact.saved = true;
      if (action === "remove") {
        if (contact.gmAssignmentId) {
          contactBook.dismissedGMContactIds ??= [];
          contactBook.dismissedGMContactIds.push(contact.gmAssignmentId);
        }
        contactBook.contacts = contactBook.contacts.filter((candidate) => candidate.id !== entry.contactId);
        selection.delete(entry.key);
      }
      try {
        await persistPlayerContactBook(game.user, contactBook);
        ui.notifications.info(action === "save" ? `${entry.name} saved to contacts.` : `${entry.name} removed from contacts.`);
      } catch (error) {
        console.error(`${MODULE_ID} | Contact update failed`, error);
        ui.notifications.error("The contact list could not be updated.");
      }
      renderChips();
      renderMenu();
      notify();
      return;
    }

    if (!multi) selection.clear();
    if (multi && selection.has(entry.key)) selection.delete(entry.key);
    else selection.set(entry.key, entry);

    input.value = "";
    renderChips();
    renderMenu();
    if (!multi) closeMenu();
    notify();
  });

  const documentClick = (event) => {
    if (!picker.contains(event.target)) closeMenu();
  };
  document.addEventListener("click", documentClick);

  renderChips();
  return {
    getIds,
    getKeys,
    getEntries,
    setKeys(keys = []) {
      selection.clear();
      for (const key of keys) {
        const entry = entryByKey(key);
        if (entry) selection.set(entry.key, entry);
      }
      renderChips();
      renderMenu();
      notify();
    },
    setIds(ids = []) {
      this.setKeys(ids.map((id) => `actor:${id}`));
    },
    refresh({ prune = true } = {}) {
      if (prune) {
        const availableKeys = new Set(entries().map((entry) => entry.key));
        for (const key of selection.keys()) {
          if (!availableKeys.has(key)) selection.delete(key);
        }
      }
      renderChips();
      renderMenu();
      notify();
    },
    destroy() {
      document.removeEventListener("click", documentClick);
    }
  };
}

async function openContactManager() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can add contacts to player address books.");

  const players = nonGMPlayerUsers();
  if (!players.length) return ui.notifications.warn("No player users are available.");
  const playerOptions = players.map((user) => {
    const characterName = String(user.character?.name ?? "").trim();
    const label = characterName && normalize(characterName) !== normalize(user.name)
      ? `${user.name} — ${characterName}`
      : String(user.name ?? "Player");
    return `<option value="${esc(user.id)}">${esc(label)}</option>`;
  }).join("");

  const content = `
    <div class="holophone-shell holophone-contact-manager-shell">
      <div class="holophone-header">
        <div class="holophone-logo"><i class="fas fa-address-book"></i></div>
        <div class="holophone-brand-copy">
          <div class="holophone-brand-kicker">DIRECTORY CONTROL // PRIVATE ACCESS</div>
          <div class="holophone-title">Player Contact Access</div>
          <div class="holophone-subtitle">Assign Player Characters and NPCs to one player's or every player's private directory.</div>
        </div>
        <div class="holophone-mode-chip">GM ONLY</div>
      </div>
      <div class="holophone-card">
        ${pickerHTML("NPC Contact", "Search NPCs…", [], false)}
        <div class="holophone-muted holophone-contact-manager-note">NPCs remain hidden unless you assign them here or they message a player.</div>
      </div>
      <div class="holophone-card">
        ${pickerHTML("Player Character", "Search Player Characters…", [], false)}
        <div class="holophone-muted holophone-contact-manager-note">Player Characters are no longer shared automatically. Assign only the contacts this table should know.</div>
      </div>
      <div class="holophone-card holophone-contact-manager-grid">
        <label class="holophone-field">
          <span class="holophone-label">Contact Name / Alias</span>
          <input type="text" class="holophone-contact-alias" maxlength="120" placeholder="Defaults to the selected actor name">
        </label>
        <label class="holophone-field">
          <span class="holophone-label">Add For</span>
          <select class="holophone-contact-target">
            <option value="all">All Players</option>
            <optgroup label="One Player">${playerOptions}</optgroup>
          </select>
        </label>
      </div>
      <div class="holophone-contact-manager-actions">
        <button type="button" class="holophone-btn holophone-send holophone-grant-contact">
          <i class="fas fa-user-plus"></i> Add to Player Contacts
        </button>
        <button type="button" class="holophone-btn holophone-revoke-contact">
          <i class="fas fa-user-minus"></i> Remove GM-Added Contact
        </button>
      </div>
      <div class="holophone-muted holophone-tip">Assigned PCs appear under Player Characters; assigned NPCs appear under GM Contacts. Saved, recent, and player-managed contacts are preserved.</div>
    </div>`;

  let dialog = null;
  let busy = false;
  let npcAPI = null;
  let pcAPI = null;
  dialog = new Dialog({
    title: "Manage Player Contacts",
    content,
    buttons: {},
    render: (html) => {
      const app = html[0].closest(".app");
      applyDialogTheme(app, undefined, "contacts");
      const root = html[0].querySelector(".holophone-contact-manager-shell");
      const aliasInput = root.querySelector(".holophone-contact-alias");
      const targetSelect = root.querySelector(".holophone-contact-target");
      const grantButton = root.querySelector(".holophone-grant-contact");
      const revokeButton = root.querySelector(".holophone-revoke-contact");
      let generatedAlias = "";

      const npcEntries = () => allActors()
        .filter((actor) => !actorHasPlayerOwner(actor))
        .map(actorPickerEntry);
      const pcEntries = () => playerCharacterActors().map(actorPickerEntry);

      const updateAlias = (actor) => {
        const currentAlias = aliasInput.value.trim();
        if (!currentAlias || currentAlias === generatedAlias) {
          generatedAlias = actor?.name ?? "";
          aliasInput.value = generatedAlias;
        }
      };

      npcAPI = wirePicker(root, "NPC Contact", {
        entryProvider: npcEntries,
        onChange: (entries) => {
          const actor = entries[0]?.actor ?? null;
          if (!actor) return;
          pcAPI?.setKeys([]);
          updateAlias(actor);
        }
      });

      pcAPI = wirePicker(root, "Player Character", {
        entryProvider: pcEntries,
        onChange: (entries) => {
          const actor = entries[0]?.actor ?? null;
          if (!actor) return;
          npcAPI?.setKeys([]);
          updateAlias(actor);
        }
      });

      const selectedActor = () => npcAPI.getEntries()[0]?.actor ?? pcAPI.getEntries()[0]?.actor ?? null;
      const selectedUserIds = () => {
        const targetValue = targetSelect.value;
        return targetValue === "all" ? players.map((user) => user.id) : [targetValue];
      };

      const setBusy = (value) => {
        busy = value;
        grantButton.disabled = value;
        revokeButton.disabled = value;
      };

      const grant = async () => {
        if (busy) return;
        const actor = selectedActor();
        if (!actor) return ui.notifications.warn("Choose a Player Character or NPC contact first.");

        setBusy(true);
        try {
          const result = await grantPlayerContact({ actor, alias: aliasInput.value, userIds: selectedUserIds() });
          if (!result) return;
          const audience = result.users.length === 1 ? result.users[0].name : `${result.users.length} players`;
          ui.notifications.info(`${result.alias} added to ${audience}.`);
        } catch (error) {
          console.error(`${MODULE_ID} | Player contact assignment failed`, error);
          ui.notifications.error(error.message ?? "The contact could not be added to the selected player address book.");
        } finally {
          setBusy(false);
        }
      };

      const revoke = async () => {
        if (busy) return;
        const actor = selectedActor();
        if (!actor) return ui.notifications.warn("Choose a Player Character or NPC contact first.");

        setBusy(true);
        try {
          const result = await revokePlayerContact({ actor, userIds: selectedUserIds() });
          if (!result) return;
          const audience = result.users.length === 1 ? result.users[0].name : `${result.users.length} players`;
          if (result.removed > 0) ui.notifications.info(`${actor.name} removed from ${audience}.`);
          else ui.notifications.warn(`${actor.name} has no GM-added contact entry for ${audience}.`);
        } catch (error) {
          console.error(`${MODULE_ID} | Player contact removal failed`, error);
          ui.notifications.error(error.message ?? "The contact could not be removed from the selected player address book.");
        } finally {
          setBusy(false);
        }
      };

      grantButton.addEventListener("click", grant);
      revokeButton.addEventListener("click", revoke);
      aliasInput.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") grant();
      });
    },
    close: () => {
      npcAPI?.destroy();
      pcAPI?.destroy();
    }
  }, { width: 680, height: "auto", resizable: true });

  dialog.render(true);
  return dialog;
}

function normalizeLaunchInput(input) {
  let value = input;
  if (Array.isArray(value)) value = value[0] ?? {};
  if (!value || typeof value !== "object") value = {};
  const fromId = value.fromId ?? value.fromActorId ?? value.actorId ?? "";
  const rawTo = value.toIds ?? value.toActorIds ?? value.recipients ?? [];
  const toIds = Array.isArray(rawTo)
    ? rawTo
    : rawTo === undefined || rawTo === null
      ? []
      : String(rawTo).split(",");
  return {
    fromId: String(fromId || ""),
    toIds: toIds.map(String).map((id) => id.trim()).filter(Boolean),
    message: String(value.message ?? "")
  };
}

function applyDialogTheme(app, era2045 = game.settings.get(MODULE_ID, "era2045"), kind = null) {
  const element = app?.element?.[0] ?? app;
  if (!element) return;
  element.classList.add("holophone-dialog");
  const dialogKind = kind ?? element.dataset.holophoneDialogKind ?? "messenger";
  element.dataset.holophoneDialogKind = dialogKind;
  element.style.setProperty("--holophone-accent", era2045 ? ERA_2045 : ERA_2077);
  element.dataset.holophoneEra = era2045 ? "2045" : "2077";
  for (const label of element.querySelectorAll(".holophone-mode-chip[data-era-label]")) {
    label.textContent = `${era2045 ? "2045" : "2077"} ${dialogKind === "network" ? "FEED" : "LINK"}`;
  }
  const title = element.querySelector(".window-title");
  if (title) {
    if (dialogKind === "network") title.textContent = `Compose ${networkIdentity(era2045).name} Broadcast`;
    else if (dialogKind === "contacts") title.textContent = "Manage Player Contacts";
    else if (dialogKind === "rules") title.textContent = "Emergency Response Rules";
    else title.textContent = `${era2045 ? "Agent" : "Holophone"} Messenger`;
  }
}

function refreshOpenDialogThemes(era2045) {
  for (const element of document.querySelectorAll(".holophone-dialog")) applyDialogTheme(element, era2045);
}

async function openMessenger(input = null) {
  const launch = normalizeLaunchInput(input);
  const selectedActor = canvas.tokens.controlled[0]?.actor ?? game.user.character ?? null;
  const prefs = await game.user.getFlag("world", PREF_FLAG) ?? {};
  const contactBook = game.user.isGM ? null : playerContactBook(game.user);
  const preferredFrom = launch.fromId || prefs.fromId || selectedActor?.id || "";
  const preferredTo = launch.toIds.length
    ? launch.toIds.map((id) => `actor:${id}`)
    : String(prefs.toKeysCSV ?? prefs.toIdsCSV ?? "").split(",").map((key) => key.trim()).filter(Boolean);
  const corruptionPct = clamp(prefs.corruptionPct ?? 50, 0, 100);
  const whisperPreference = game.user.isGM
    ? Boolean(prefs.whisperToPlayers)
    : Boolean(prefs.whisperToGM ?? prefs.whisper);
  const whisperLabel = game.user.isGM ? "Whisper to Player" : "Whisper to GM";
  const fromPlaceholder = game.user.isGM ? "Search player characters or NPCs…" : "Search your player characters…";
  const toPlaceholder = game.user.isGM ? "Search player characters or NPCs…" : "Search your assigned, saved, or recent contacts…";

  const content = `
    <div class="holophone-shell">
      <div class="holophone-header">
        <div class="holophone-logo"><i class="fas fa-mobile-screen-button"></i></div>
        <div class="holophone-brand-copy">
          <div class="holophone-brand-kicker">SECURE PERSONAL LINK // ENCRYPTED</div>
          <div class="holophone-title">${esc(currentTerm())} Messenger</div>
          <div class="holophone-subtitle holophone-messenger-subtitle">${esc(networkIdentity().name)} messaging, transfers, and emergency dispatch</div>
        </div>
        <div class="holophone-mode-chip" data-era-label>${game.settings.get(MODULE_ID, "era2045") ? "2045" : "2077"} LINK</div>
      </div>

      <div class="holophone-grid-2">
        <div class="holophone-card">
          ${pickerHTML("From", fromPlaceholder, preferredFrom ? [`actor:${preferredFrom}`] : [], false)}
          <input type="text" class="holophone-alias-from" placeholder="Alias for From (optional)" value="${esc(prefs.fromAlias ?? "")}">
        </div>
        <div class="holophone-card">
          ${pickerHTML("To", toPlaceholder, preferredTo, true)}
          <input type="text" class="holophone-alias-to" placeholder="Alias for To (single recipient only)" value="${esc(prefs.toAlias ?? "")}">
          ${game.user.isGM ? `
            <div class="holophone-to-tools">
              <label class="holophone-check"><input type="checkbox" class="holophone-all-players"> Add all Player Characters on this Scene</label>
              <button type="button" class="holophone-btn holophone-btn-contact-manager">
                <i class="fas fa-address-book"></i> Manage Player Contacts
              </button>
            </div>` : ""}
        </div>
      </div>

      <div class="holophone-card">
        <div class="holophone-label">Message</div>
        <textarea class="holophone-message" placeholder="Type your in-character message…">${esc(launch.message)}</textarea>
      </div>

      <div class="holophone-card holophone-options">
        <label class="holophone-check"><input type="checkbox" class="holophone-emote" ${prefs.emote ? "checked" : ""}> Emote style</label>
        <label class="holophone-check"><input type="checkbox" class="holophone-whisper" ${whisperPreference ? "checked" : ""}> ${whisperLabel}</label>
        ${game.user.isGM ? `
          <label class="holophone-check"><input type="checkbox" class="holophone-compromised" ${prefs.compromised ? "checked" : ""}> Compromised</label>
          <label class="holophone-check holophone-with-number">
            <input type="checkbox" class="holophone-corrupted" ${prefs.corrupted ? "checked" : ""}> Corrupted
            <input type="number" class="holophone-corruption-pct" min="0" max="100" step="1" value="${corruptionPct}"><span>%</span>
          </label>
          <label class="holophone-check holophone-with-number">
            <input type="checkbox" class="holophone-charge" ${prefs.chargeOn ? "checked" : ""}> Eb Charge
            <input type="number" class="holophone-charge-amount" min="0" step="1" value="${Math.max(0, Number(prefs.chargeEb) || 0)}">
          </label>
          <label class="holophone-check holophone-with-number">
            <input type="checkbox" class="holophone-credit" ${prefs.creditOn ? "checked" : ""}> Eb Credit
            <input type="number" class="holophone-credit-amount" min="0" step="1" value="${Math.max(0, Number(prefs.creditEb) || 0)}">
          </label>` : ""}
        <label class="holophone-check holophone-with-number">
          <input type="checkbox" class="holophone-transfer" ${prefs.transferOn ? "checked" : ""}> Transfer Eb
          <input type="number" class="holophone-transfer-amount" min="0" step="1" value="${Math.max(0, Number(prefs.transferEb) || 0)}">
        </label>
        ${game.user.isGM
          ? `<label class="holophone-check"><input type="checkbox" class="holophone-era" ${game.settings.get(MODULE_ID, "era2045") ? "checked" : ""}> 2045 Mode</label>`
          : `<label class="holophone-check holophone-disabled"><input type="checkbox" disabled ${game.settings.get(MODULE_ID, "era2045") ? "checked" : ""}> 2045 Mode (GM)</label>`}
      </div>

      <div class="holophone-card holophone-emergency-panel">
        <div class="holophone-section-title">Emergency Services</div>
        <div class="holophone-emergency-grid">
          <div class="holophone-service">
            <div><b>R.E.O. Meatwagon</b><div class="holophone-reo-status holophone-muted">Select a real caller.</div></div>
            <button type="button" class="holophone-btn holophone-btn-reo"><i class="fas fa-truck-medical"></i> Call R.E.O.</button>
          </div>
          <div class="holophone-service">
            <div><b>Trauma Team</b><div class="holophone-trauma-status holophone-muted">Membership required.</div></div>
            <button type="button" class="holophone-btn holophone-btn-trauma"><i class="fas fa-helicopter"></i> Call Trauma Team</button>
          </div>
        </div>
        ${game.user.isGM ? `
          <div class="holophone-emergency-controls">
            <label class="holophone-check holophone-emergency-mode">
              <input type="checkbox" class="holophone-skip-lifestyle" ${skipLifestyleChecks() ? "checked" : ""}>
              Skip lifestyle check
            </label>
            <button type="button" class="holophone-btn holophone-btn-response-rules">
              <i class="fas fa-dice"></i> Response Rules
            </button>
          </div>
          <div class="holophone-muted">R.E.O. uses its flat 5eb call fee while enabled. Trauma Team membership rules are unchanged.</div>` : ""}
      </div>

      ${game.user.isGM ? `
        <div class="holophone-card holophone-network-panel">
          <div class="holophone-section-title">Public Network</div>
          <div class="holophone-service">
            <div>
              <b class="holophone-network-name">${esc(networkIdentity().name)} Broadcast</b>
              <div class="holophone-network-status holophone-muted">Post a styled public feed message to chat.</div>
            </div>
            <button type="button" class="holophone-btn holophone-btn-network">
              <i class="fas fa-tower-broadcast"></i> Compose ${esc(networkIdentity().name)}
            </button>
          </div>
        </div>` : ""}

      <button type="button" class="holophone-btn holophone-send"><i class="fas fa-comment-dots"></i> Send IC</button>
      <div class="holophone-muted holophone-tip">${game.user.isGM
        ? "Ctrl/Cmd + Enter sends. Containers are excluded; contacts are separated into Player Characters and NPCs."
        : "Ctrl/Cmd + Enter sends. Your directory contains only contacts assigned by the GM or saved from prior messages."}</div>
    </div>`;

  let eraHook = null;
  let emergencyRulesHook = null;
  let playerContactHook = null;
  let gmContactDirectoryHook = null;
  let dialog = null;
  let busy = false;
  const cleanup = [];

  dialog = new Dialog({
    title: `${currentTerm()} Messenger`,
    content,
    buttons: {},
    render: (html) => {
      const app = html[0].closest(".app");
      applyDialogTheme(app, undefined, "messenger");
      const root = html[0].querySelector(".holophone-shell");
      const query = (selector) => root.querySelector(selector);

      const fromAPI = wirePicker(root, "From", { onChange: updateEmergencyStatus, contactBook });
      const toAPI = wirePicker(root, "To", { contactBook });
      cleanup.push(() => fromAPI.destroy(), () => toAPI.destroy());

      if (!game.user.isGM && contactBook) {
        const refreshPlayerContacts = () => {
          const refreshed = playerContactBook(game.user);
          contactBook.version = refreshed.version;
          contactBook.contacts = refreshed.contacts;
          contactBook.dismissedGMContactIds = refreshed.dismissedGMContactIds;
          toAPI.refresh();
        };
        playerContactHook = (user) => {
          if (user?.id !== game.user.id) return;
          refreshPlayerContacts();
        };
        gmContactDirectoryHook = () => refreshPlayerContacts();
        Hooks.on("updateUser", playerContactHook);
        Hooks.on("holophone-gmContactDirectory-changed", gmContactDirectoryHook);
      }

      const messageBox = query(".holophone-message");
      const fromAlias = query(".holophone-alias-from");
      const toAlias = query(".holophone-alias-to");
      const emote = query(".holophone-emote");
      const whisper = query(".holophone-whisper");
      const compromised = query(".holophone-compromised");
      const corrupted = query(".holophone-corrupted");
      const corruptionInput = query(".holophone-corruption-pct");
      const chargeOn = query(".holophone-charge");
      const chargeAmount = query(".holophone-charge-amount");
      const creditOn = query(".holophone-credit");
      const creditAmount = query(".holophone-credit-amount");
      const transferOn = query(".holophone-transfer");
      const transferAmount = query(".holophone-transfer-amount");
      const eraToggle = query(".holophone-era");
      const skipLifestyleToggle = query(".holophone-skip-lifestyle");
      const allPlayers = query(".holophone-all-players");
      const reoButton = query(".holophone-btn-reo");
      const traumaButton = query(".holophone-btn-trauma");
      const responseRulesButton = query(".holophone-btn-response-rules");
      const networkButton = query(".holophone-btn-network");
      const contactManagerButton = query(".holophone-btn-contact-manager");
      const networkName = query(".holophone-network-name");
      const messengerSubtitle = query(".holophone-messenger-subtitle");

      function selectedCaller() {
        return fromAPI.getEntries()[0]?.actor ?? null;
      }

      function updateEmergencyStatus() {
        const actor = selectedCaller();
        const reoStatus = query(".holophone-reo-status");
        const traumaStatus = query(".holophone-trauma-status");
        const usable = canUseActor(actor);

        if (!actor) {
          reoStatus.textContent = "Select a real caller.";
          traumaStatus.textContent = "Membership required.";
          reoButton.disabled = true;
          traumaButton.disabled = true;
          return;
        }

        const lifestyleSkipped = skipLifestyleChecks();
        const reoMembership = findMembership(actor, "reo");
        const reoFormula = resolveResponseFormula("reo", reoMembership).formula;
        if (lifestyleSkipped) {
          reoStatus.textContent = `${REO_CALL_FEE}eb flat call · ETA ${reoFormula} rounds`;
        } else {
          const lifestyle = inspectLifestyle(actor);
          const waived = lifestyle.totalMonthly > REO_FREE_THRESHOLD;
          reoStatus.textContent = `${waived ? "Free call" : `${REO_CALL_FEE}eb call`} · ETA ${reoFormula} rounds · lifestyle ${lifestyle.totalMonthly}eb/month`;
        }
        reoButton.disabled = !usable;

        const membership = findMembership(actor, "trauma");
        const traumaFormula = membership ? resolveResponseFormula("trauma", membership).formula : "";
        traumaStatus.textContent = membership ? `${membership.tier} membership · ETA ${traumaFormula} rounds` : "No active membership detected";
        traumaButton.disabled = !usable || !membership;
      }

      function updateNetworkLabels(era2045 = game.settings.get(MODULE_ID, "era2045")) {
        const identity = networkIdentity(Boolean(era2045));
        if (messengerSubtitle) messengerSubtitle.textContent = `${identity.name} messaging, transfers, and emergency dispatch`;
        if (networkName) networkName.textContent = `${identity.name} Broadcast`;
        if (networkButton) networkButton.innerHTML = `<i class="fas fa-tower-broadcast"></i> Compose ${esc(identity.name)}`;
      }

      if (allPlayers) {
        allPlayers.addEventListener("change", () => {
          if (!allPlayers.checked) return;
          const ids = [...new Set((canvas.tokens?.placeables ?? [])
            .filter((token) => isContactActor(token.actor) && token.actor.hasPlayerOwner)
            .map((token) => token.actor.id))];
          toAPI.setIds(ids);
        });
      }

      if (eraToggle) {
        eraToggle.addEventListener("change", async () => {
          await game.settings.set(MODULE_ID, "era2045", eraToggle.checked);
        });
      }

      if (skipLifestyleToggle) {
        skipLifestyleToggle.addEventListener("change", async () => {
          await game.settings.set(MODULE_ID, "skipLifestyleChecks", skipLifestyleToggle.checked);
        });
      }

      responseRulesButton?.addEventListener("click", () => openResponseRules());

      reoButton.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        reoButton.disabled = true;
        traumaButton.disabled = true;
        try {
          await callREO(selectedCaller());
        } catch (error) {
          console.error(`${MODULE_ID} | R.E.O. call failed`, error);
          ui.notifications.error(error.message ?? "The R.E.O. call failed.");
        } finally {
          busy = false;
          updateEmergencyStatus();
        }
      });

      traumaButton.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        reoButton.disabled = true;
        traumaButton.disabled = true;
        try {
          await callTrauma(selectedCaller());
        } catch (error) {
          console.error(`${MODULE_ID} | Trauma Team call failed`, error);
          ui.notifications.error(error.message ?? "The Trauma Team call failed.");
        } finally {
          busy = false;
          updateEmergencyStatus();
        }
      });

      networkButton?.addEventListener("click", () => openNetworkComposer());
      contactManagerButton?.addEventListener("click", () => openContactManager());

      async function sendMessage() {
        const fromActor = selectedCaller();
        const recipientEntries = toAPI.getEntries();
        if (!recipientEntries.length) return ui.notifications.warn("Pick at least one recipient in To.");

        const unavailableContacts = recipientEntries.filter((entry) => entry.kind === "contact" && entry.unavailable);
        if (unavailableContacts.length) {
          await postUnavailableNumber(unavailableContacts);
          return;
        }

        const relayContacts = recipientEntries.filter((entry) => entry.kind === "contact" && entry.route === "gm");
        if (relayContacts.length && relayContacts.length !== recipientEntries.length) {
          return ui.notifications.warn("Send to an alias-only contact separately from other recipients.");
        }

        const recipients = [...new Map(recipientEntries
          .map((entry) => entry.actor)
          .filter(Boolean)
          .map((actor) => [actor.id, actor])).values()];
        const remotePlayerContacts = [...new Map(recipientEntries
          .filter((entry) => entry.remotePlayerContact)
          .map((entry) => [entry.actorUuid, entry])).values()];
        if (!recipients.length && !remotePlayerContacts.length && !relayContacts.length) {
          return ui.notifications.warn("Pick at least one available recipient in To.");
        }

        const whisperPlayerIds = game.user.isGM && whisper.checked
          ? playerOwnersForActors(recipients.filter(actorHasPlayerOwner)).map((user) => user.id)
          : [];
        if (game.user.isGM && whisper.checked && !whisperPlayerIds.length) {
          return ui.notifications.warn("Whisper to Player requires at least one Player Character recipient in To.");
        }

        const rawMessage = messageBox.value ?? "";
        if (!rawMessage.trim()) return ui.notifications.warn("Write a message first.");

        const senderAliasInput = fromAlias.value.trim();
        const senderAlias = senderAliasInput || fromActor?.name || "";
        if (!senderAlias) return ui.notifications.warn("Pick a sender or enter a From alias.");

        const monetaryActions = [chargeOn?.checked, creditOn?.checked, transferOn?.checked].filter(Boolean).length;
        if (monetaryActions > 1) return ui.notifications.warn("Choose only one monetary action: Charge, Credit, or Transfer.");

        if (transferOn?.checked && (!fromActor || !canUseActor(fromActor))) {
          return ui.notifications.warn("You must own the real From actor to transfer eb.");
        }
        if (!game.user.isGM && transferOn?.checked
          && recipientEntries.some((entry) => !actorHasPlayerOwner(entry.actor) && !entry.remotePlayerContact)) {
          return ui.notifications.warn("Player transfers can only be sent to Player Character recipients.");
        }

        const use2045 = game.settings.get(MODULE_ID, "era2045");
        const term = use2045 ? "Agent" : "Holophone";
        let tag = `${term} Message`;
        if (compromised?.checked) tag = `Compromised ${term} Message`;
        if (corrupted?.checked) tag = `Corrupted ${term} Message`;

        const percentage = clamp(corruptionInput?.value ?? 50, 0, 100);
        const processedMessage = corrupted?.checked ? garble(rawMessage, percentage / 100) : rawMessage;
        let body = esc(processedMessage).replace(/\r\n|\r|\n/g, "<br>");
        if (emote.checked) body = `<em>${body}</em>`;

        const recipientNames = recipientEntries.map((entry) => entry.name);
        const recipientAlias = toAlias.value.trim();
        const recipientText = recipientEntries.length === 1 && recipientAlias ? recipientAlias : recipientNames.join(", ");
        const ledgerFrom = senderAlias || "Unknown";
        const ledgerTo = recipientText || "Unknown";

        let note = "";
        if (game.user.isGM && chargeOn?.checked) {
          const amount = Math.max(0, Math.trunc(Number(chargeAmount.value) || 0));
          if (amount > 0) {
            note = `${amount}eb Charge `;
            for (const recipient of recipients) {
              try {
                await adjustWealth(recipient, -amount, `${term} Charge (to ${ledgerFrom})`);
              } catch (error) {
                console.warn(`${MODULE_ID} | Charge failed for ${recipient.name}`, error);
                ui.notifications.warn(`Could not deduct eb from ${recipient.name}.`);
              }
            }
          }
        }

        if (game.user.isGM && creditOn?.checked) {
          const amount = Math.max(0, Math.trunc(Number(creditAmount.value) || 0));
          if (amount > 0) {
            note = `${amount}eb Credit `;
            for (const recipient of recipients) {
              try {
                await adjustWealth(recipient, amount, `${term} Credit (from ${ledgerFrom})`);
              } catch (error) {
                console.warn(`${MODULE_ID} | Credit failed for ${recipient.name}`, error);
                ui.notifications.warn(`Could not add eb to ${recipient.name}.`);
              }
            }
          }
        }

        if (transferOn.checked) {
          const amount = Math.max(0, Math.trunc(Number(transferAmount.value) || 0));
          if (amount > 0) {
            await adjustWealthRaw(fromActor, -(amount * (recipients.length + remotePlayerContacts.length)), `${term} Transfer (sent to ${ledgerTo})`);
            for (const recipient of recipients) {
              try {
                await adjustWealth(recipient, amount, `${term} Transfer (received from ${ledgerFrom})`);
              } catch (error) {
                console.warn(`${MODULE_ID} | Transfer failed for ${recipient.name}`, error);
                ui.notifications.warn(`Could not deliver the transfer to ${recipient.name}.`);
              }
            }
            for (const contact of remotePlayerContacts) {
              try {
                await createRemoteDepositRequest(contact, amount, `${term} Transfer (received from ${ledgerFrom})`);
              } catch (error) {
                console.warn(`${MODULE_ID} | Remote transfer failed for ${contact.name}`, error);
                ui.notifications.warn(`Could not deliver the transfer to ${contact.name}.`);
              }
            }
            note = `${amount}eb Transfer `;
          }
        }

        const clock = currentChatClock();
        const whisperMode = relayContacts.length
          ? "gm-relay"
          : whisper.checked
            ? (game.user.isGM ? "players" : "gm")
            : "public";
        const chatContent = messengerCard({
          senderAlias,
          recipientText,
          body,
          status: tag,
          transaction: note,
          whisperMode,
          portrait: aliasPortrait(fromActor, senderAlias, Boolean(senderAliasInput)),
          era2045: use2045,
          clock
        });

        let speaker;
        if (fromActor) {
          const tokenDoc = fromActor.getActiveTokens?.()[0]?.document ?? null;
          speaker = ChatMessage.getSpeaker({ scene: canvas.scene, actor: fromActor, token: tokenDoc ?? undefined, alias: senderAlias });
        } else {
          speaker = ChatMessage.getSpeaker({ scene: canvas.scene, alias: senderAlias });
        }

        const whisperIds = resolveMessengerWhisperIds({
          recipients,
          relayContacts,
          whisper: whisper.checked,
          senderIsGM: game.user.isGM
        });
        await ChatMessage.create({
          content: chatContent,
          speaker,
          type: CONST.CHAT_MESSAGE_TYPES.IC,
          whisper: whisperIds,
          flags: {
            [MODULE_ID]: {
              messenger: {
                senderActorUuid: fromActor?.uuid ?? "",
                senderAlias,
                recipientActorIds: [...new Set([
                  ...recipients.map((actor) => actor.id),
                  ...remotePlayerContacts.map((contact) => contact.actorId).filter(Boolean)
                ])],
                relayAliases: relayContacts.map((entry) => entry.name),
                whisperMode
              },
              clock: chatClockFlag(clock)
            }
          }
        });

        if (game.user.isGM) {
          try {
            await rememberIncomingContact({ actor: fromActor, alias: senderAlias, recipients });
          } catch (error) {
            console.error(`${MODULE_ID} | Recent contact delivery failed`, error);
            ui.notifications.warn("The message was sent, but a player's recent contacts could not be updated.");
          }
        }

        await game.user.setFlag("world", PREF_FLAG, {
          fromId: fromActor?.id ?? "",
          toKeysCSV: toAPI.getKeys().join(","),
          toIdsCSV: toAPI.getIds().join(","),
          fromAlias: senderAliasInput,
          toAlias: recipientAlias,
          emote: emote.checked,
          whisper: whisper.checked,
          whisperToPlayers: game.user.isGM ? whisper.checked : Boolean(prefs.whisperToPlayers),
          whisperToGM: game.user.isGM ? Boolean(prefs.whisperToGM ?? prefs.whisper) : whisper.checked,
          compromised: Boolean(compromised?.checked),
          corrupted: Boolean(corrupted?.checked),
          corruptionPct: percentage,
          chargeOn: Boolean(chargeOn?.checked),
          chargeEb: Math.max(0, Math.trunc(Number(chargeAmount?.value) || 0)),
          creditOn: Boolean(creditOn?.checked),
          creditEb: Math.max(0, Math.trunc(Number(creditAmount?.value) || 0)),
          transferOn: transferOn.checked,
          transferEb: Math.max(0, Math.trunc(Number(transferAmount.value) || 0)),
          era2045: use2045
        });

        messageBox.value = "";
      }

      query(".holophone-send").addEventListener("click", sendMessage);
      messageBox.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") sendMessage();
      });

      eraHook = (value) => {
        applyDialogTheme(app, Boolean(value), "messenger");
        updateNetworkLabels(Boolean(value));
      };
      Hooks.on("holophone-era2045-changed", eraHook);
      emergencyRulesHook = () => {
        if (skipLifestyleToggle) skipLifestyleToggle.checked = skipLifestyleChecks();
        updateEmergencyStatus();
      };
      Hooks.on("holophone-skipLifestyleChecks-changed", emergencyRulesHook);
      Hooks.on("holophone-responseRules-changed", emergencyRulesHook);
      updateEmergencyStatus();
      updateNetworkLabels();
    },
    close: () => {
      for (const fn of cleanup) fn();
      if (eraHook) Hooks.off("holophone-era2045-changed", eraHook);
      if (emergencyRulesHook) Hooks.off("holophone-skipLifestyleChecks-changed", emergencyRulesHook);
      if (emergencyRulesHook) Hooks.off("holophone-responseRules-changed", emergencyRulesHook);
      if (playerContactHook) Hooks.off("updateUser", playerContactHook);
      if (gmContactDirectoryHook) Hooks.off("holophone-gmContactDirectory-changed", gmContactDirectoryHook);
    }
  }, { width: 760, height: "auto", resizable: true });

  dialog.render(true);
  return dialog;
}

async function ensureWorldMacro() {
  if (!game.user.isGM) return;
  const activeGM = game.users.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return;

  const existing = game.macros.find((macro) => macro.getFlag(MODULE_ID, "launcher") === true)
    ?? game.macros.getName("Holophone/Agent Messenger™");
  if (existing) {
    const update = {};
    if (existing.img !== LAUNCHER_ICON) update.img = LAUNCHER_ICON;
    if (existing.getFlag(MODULE_ID, "launcher") !== true) update[`flags.${MODULE_ID}.launcher`] = true;
    if (Object.keys(update).length) await existing.update(update);
    return existing;
  }

  return Macro.create({
    name: "Holophone/Agent Messenger™",
    type: "script",
    scope: "global",
    img: LAUNCHER_ICON,
    command: 'return game.holophone.open(typeof args === "undefined" ? null : args);',
    flags: { [MODULE_ID]: { launcher: true } }
  });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "era2045", {
    name: "2045 Mode",
    hint: "Use Agent wording and the 2045 red theme instead of Holophone wording and the 2077 cyan theme.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      Hooks.callAll("holophone-era2045-changed", value);
      refreshOpenDialogThemes(value);
    }
  });
  game.settings.register(MODULE_ID, "skipLifestyleChecks", {
    name: "Skip Lifestyle Check",
    hint: "Do not inspect food or housing for R.E.O. calls; always use the flat 5eb call fee. Trauma Team membership requirements are unchanged.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => Hooks.callAll("holophone-skipLifestyleChecks-changed", value)
  });
  game.settings.register(MODULE_ID, "responseRules", {
    name: "Emergency Response Rules",
    hint: "World-level R.E.O. and Trauma Team response formulas, including optional membership-tier overrides.",
    scope: "world",
    config: false,
    type: Object,
    default: duplicate(DEFAULT_RESPONSE_RULES),
    onChange: (value) => Hooks.callAll("holophone-responseRules-changed", value)
  });
  game.settings.register(MODULE_ID, GM_CONTACT_DIRECTORY_SETTING, {
    name: "GM Contact Directory",
    hint: "GM-authored Player Character and NPC assignments keyed to individual player users.",
    scope: "world",
    config: false,
    type: Object,
    default: { version: 1, users: {} },
    onChange: (value) => Hooks.callAll("holophone-gmContactDirectory-changed", value)
  });
  game._holoEraReg = true;
});

Hooks.once("ready", async () => {
  bindDepositHandler();

  try {
    await purgeReservedNetworkContacts();
  } catch (error) {
    console.warn(`${MODULE_ID} | Reserved network contact cleanup failed`, error);
  }

  try {
    await upgradeLegacyContactPortraits();
  } catch (error) {
    console.warn(`${MODULE_ID} | Legacy contact portrait upgrade failed`, error);
  }

  try {
    await migrateLegacyGMContactsToDirectory();
  } catch (error) {
    console.warn(`${MODULE_ID} | Legacy GM contact migration failed`, error);
  }

  const api = {
    open: openMessenger,
    openMessenger,
    callREO,
    callTrauma,
    openResponseRules,
    getResponseRules: responseRules,
    resolveResponseFormula,
    openNetworkComposer,
    postNetworkBroadcast,
    openContactManager,
    grantPlayerContact,
    revokePlayerContact,
    getGMContactDirectory: gmContactDirectory,
    inspectLifestyle,
    findTraumaMembership: (actor) => findMembership(actor, "trauma"),
    findREOMembership: (actor) => findMembership(actor, "reo"),
    getChatClock: currentChatClock,
    version: MODULE_VERSION
  };

  game.holophone = api;
  game.holophoneMessenger = api;
  await ensureWorldMacro();
  console.log(`${MODULE_ID} | Ready v${MODULE_VERSION}. Use game.holophone.open()`);
});
