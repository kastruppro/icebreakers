#!/usr/bin/env node
/**
 * Generates a static index.md for the Icebreakers campaign site.
 * Runs during GitHub Actions build to keep index current without manual updates.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');

// Helper to get files from a directory
function getFiles(dir) {
  const fullPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => f.replace('.md', ''))
    .sort();
}

// Helper to create display name from filename
function displayName(filename) {
  return filename
    .replace(/_/g, ' ')
    .replace(/Session (\d+)/, 'Session $1:');
}

// Parse session number from filename
function getSessionNum(filename) {
  const match = filename.match(/Session_(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Generate sessions table (sorted descending)
function generateSessions() {
  const sessions = getFiles('Sessions').sort((a, b) => getSessionNum(b) - getSessionNum(a));
  let table = '| # | Session |\n|---|---------|';
  for (const s of sessions) {
    const num = getSessionNum(s);
    const title = displayName(s).replace(`Session ${num}: `, '');
    table += `\n| ${num} | [[${s}\\|${title}]] |`;
  }
  return table;
}

// Generate a simple link list
function generateLinkList(dir, prefix = '') {
  const files = getFiles(dir);
  return files.map(f => `- ${prefix}[[${f}\\|${displayName(f)}]]`).join('\n');
}

// Generate NPC tables by reading frontmatter (simplified - just list them)
function generateNPCSection() {
  const npcs = getFiles('NPCs');

  // Hardcoded categories based on known NPCs
  const allies = ['Thistle', 'Morgane', 'Raenar_Neverember', 'Sabrina_Nightgale', 'Elira_Moonshadow'];
  const family = ['Liora_Swiftclock', 'Ren_Swiftclock', 'Serina_Swiftclock', 'Arthur_De_Moray', 'Godwin_De_Moray'];
  const enemies = ['Cora', 'Ammalia_Castellers', 'Victor_Castellers', 'Tharizdun', 'Sebastian'];
  const divine = ['Tyr', 'Oghma', 'Desna'];

  const others = npcs.filter(n =>
    !allies.includes(n) && !family.includes(n) &&
    !enemies.includes(n) && !divine.includes(n)
  );

  let section = `### Key Allies

| NPC | Role |
|-----|------|`;
  for (const npc of allies.filter(n => npcs.includes(n))) {
    section += `\n| [[${npc}\\|${displayName(npc)}]] | - |`;
  }

  section += `

### Family

| NPC | Relation |
|-----|----------|`;
  for (const npc of family.filter(n => npcs.includes(n))) {
    section += `\n| [[${npc}\\|${displayName(npc)}]] | - |`;
  }

  section += `

### Enemies

| NPC | Role |
|-----|------|`;
  for (const npc of enemies.filter(n => npcs.includes(n))) {
    section += `\n| [[${npc}\\|${displayName(npc)}]] | - |`;
  }

  section += `

### Divine Beings

| Deity | Domain |
|-------|--------|`;
  for (const npc of divine.filter(n => npcs.includes(n))) {
    section += `\n| [[${npc}\\|${displayName(npc)}]] | - |`;
  }

  section += `

### Other NPCs

| NPC |
|-----|`;
  for (const npc of others) {
    section += `\n| [[${npc}\\|${displayName(npc)}]] |`;
  }

  return section;
}

// Generate locations section
function generateLocations() {
  const locations = getFiles('Locations');

  const major = ['Waterdeep', 'Neverwinter', 'Phandalin', 'Daggerford', 'The_Void', 'Dream_Realm_Castellers'];
  const waterdeep = ['House_Castellers', 'House_Castellers_Basement', 'House_of_Justice', 'Temple_of_Tharizdun', 'Sated_Satyr_Inn', 'The_Thirsty_Goat'];
  const neverwinter = ['House_of_Knowledge', 'Chapel_of_Oghma', 'House_De_Moray', 'Swiftclock_Home'];

  const others = locations.filter(l =>
    !major.includes(l) && !waterdeep.includes(l) && !neverwinter.includes(l)
  );

  let section = `### Major Locations

| Location |
|----------|`;
  for (const loc of major.filter(l => locations.includes(l))) {
    section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
  }

  section += `

### Waterdeep Locations

| Location |
|----------|`;
  for (const loc of waterdeep.filter(l => locations.includes(l))) {
    section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
  }

  section += `

### Neverwinter Locations

| Location |
|----------|`;
  for (const loc of neverwinter.filter(l => locations.includes(l))) {
    section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
  }

  section += `

### Other Locations

| Location |
|----------|`;
  for (const loc of others) {
    section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
  }

  return section;
}

// Generate loot section
function generateLoot() {
  const loot = getFiles('Loot');
  let section = `| Item |
|------|`;
  for (const item of loot) {
    section += `\n| [[${item}\\|${displayName(item)}]] |`;
  }
  return section;
}

// Generate quests section
function generateQuests() {
  const quests = getFiles('Quests');
  return quests.map(q => `- [[${q}\\|${displayName(q)}]]`).join('\n');
}

// Generate PCs table
function generatePCs() {
  return `| Character | Player | Race | Class |
|-----------|--------|------|-------|
| [[Milo_Swiftclock\\|Milo Swiftclock]] | Tobias | Harengon | Chronurgy Wizard |
| [[Modred_De_Moray\\|Modred De Moray]] | Franz | Human | Eldritch Knight |
| [[Jaspar_Starshade\\|Jaspar Starshade]] | Henrik | Aasimar | Rogue |
| [[Clover]] | Bjørn | Harengon | Moon Druid |`;
}

// Read unresolved threads from _unresolved.md (so you can edit it manually)
function getUnresolvedThreads() {
  const unresolvedPath = path.join(CONTENT_DIR, '_unresolved.md');
  if (fs.existsSync(unresolvedPath)) {
    return fs.readFileSync(unresolvedPath, 'utf8');
  }
  return `## Unresolved Threads

### Active Mysteries
- [ ] Update _unresolved.md with current mysteries

### Personal Quests
- [ ] Update _unresolved.md with current quests`;
}

// Main template
const template = `---
type: index
campaign: neverwinter-icebreakers
---

# The Icebreakers Campaign

**Campaign:** Adventures of Icespire Peak (D&D 5e)
**Party Name:** The Icebreakers

## The Party

${generatePCs()}

## Campaign Overview

The overarching plot involves cultists attempting to free the imprisoned evil god **Tharizdun**. Key story elements:
- Corruption mechanics (Modred's blackened fingers, Sebastian's fully black hands)
- Dream realm infiltrations
- Noble house intrigue (House Castellers)
- Character family storylines (Milo searching for sister Liora, Modred's father issues)
- The antagonist **Cora** (nicknamed "backflipping bitch") who escapes via triangular portals

---

## Sessions

${generateSessions()}

---

## Quests

${generateQuests()}

---

## NPCs

${generateNPCSection()}

---

## Locations

${generateLocations()}

---

## Loot & Items

${generateLoot()}

---

${getUnresolvedThreads()}
`;

// Write the file
const outputPath = path.join(CONTENT_DIR, 'index.md');
fs.writeFileSync(outputPath, template);
console.log(`Generated ${outputPath}`);
console.log(`  - Sessions: ${getFiles('Sessions').length}`);
console.log(`  - NPCs: ${getFiles('NPCs').length}`);
console.log(`  - Locations: ${getFiles('Locations').length}`);
console.log(`  - Quests: ${getFiles('Quests').length}`);
console.log(`  - Loot: ${getFiles('Loot').length}`);
