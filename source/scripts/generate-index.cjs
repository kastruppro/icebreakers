#!/usr/bin/env node
/**
 * Generates a static index.md for the Icebreakers campaign site.
 * Runs during GitHub Actions build to keep index current without manual updates.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');

// Helper to get files from a directory (non-recursive)
function getFiles(dir) {
  const fullPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => f.replace('.md', ''))
    .sort();
}

// Helper to get files recursively from a directory and all subdirectories
function getFilesRecursive(dir) {
  const fullPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];

  const results = [];

  function scanDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (item.endsWith('.md') && !item.startsWith('_')) {
        results.push(item.replace('.md', ''));
      }
    }
  }

  scanDir(fullPath);
  return results.sort();
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

// Get session title from file content (H1 heading)
function getSessionTitle(filename) {
  const filePath = path.join(CONTENT_DIR, 'Sessions', filename + '.md');
  if (!fs.existsSync(filePath)) return filename;

  const content = fs.readFileSync(filePath, 'utf8');
  // Match H1 heading, strip wiki links from it
  const h1Match = content.match(/^# (.+)$/m);
  if (h1Match) {
    // Remove wiki link syntax: [[Target|Display]] -> Display, [[Target]] -> Target
    return h1Match[1]
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1');
  }
  return filename;
}

// Generate sessions table (sorted descending)
function generateSessions() {
  const sessions = getFiles('Sessions').sort((a, b) => getSessionNum(b) - getSessionNum(a));
  let table = '| # | Session |\n|---|---------|';
  for (const s of sessions) {
    const num = getSessionNum(s);
    const title = getSessionTitle(s);
    table += `\n| ${num} | [[${s}\\|${title}]] |`;
  }
  return table;
}

// Generate a simple link list
function generateLinkList(dir, prefix = '') {
  const files = getFiles(dir);
  return files.map(f => `- ${prefix}[[${f}\\|${displayName(f)}]]`).join('\n');
}

// Generate NPC tables with descriptions
function generateNPCSection() {
  const npcs = getFilesRecursive('NPCs');

  // NPC categories and descriptions
  const allies = {
    'Thistle': '[[Clover]]\'s sister, druid trainee (rescued)',
    'Morgane': '[[Modred_De_Moray|Modred]]\'s mother, Priestess of [[Tyr]]',
    'Raenar_Neverember': '[[Lord_Neverember]]\'s son, hunter',
    'Sabrina_Nightgale': 'Ghost adventurer from 200 years ago',
    'Elira_Moonshadow': 'Divination Wizard, Archivist of [[Oghma]]',
    'Ammalia_Castellers': 'Lady of [[House_Castellers]], allied after discovering truth'
  };

  const family = {
    'Liora_Swiftclock': '[[Milo_Swiftclock|Milo]]\'s sister, prophet (rescued)',
    'Ren_Swiftclock': '[[Milo_Swiftclock|Milo]]\'s father, master horologist',
    'Serina_Swiftclock': '[[Milo_Swiftclock|Milo]]\'s mother, keeper of family secrets',
    'Arthur_De_Moray': '[[Modred_De_Moray|Modred]]\'s brother (former possession victim)',
    'Godwin_De_Moray': '[[Modred_De_Moray|Modred]]\'s father, patriarch (mentally broken)'
  };

  const enemies = {
    'Cora': '[[Tharizdun]] cultist, primary antagonist',
    'Victor_Castellers': 'Lord of [[House_Castellers]], claimed by [[Tharizdun]]',
    'Sebastian': 'Leader of Cloak Tower, severely corrupted',
    'Tharizdun': 'The Chained One, imprisoned evil god'
  };

  const divine = {
    'Tyr': 'Justice (gave party [[Tyrs_Gauntlets|gauntlets]], quest giver)',
    'Oghma': 'Knowledge (library at [[House_of_Knowledge]])',
    'Desna': 'Dreams & Stars (guides [[Jaspar_Starshade|Jaspar]])'
  };

  const allCategorized = [...Object.keys(allies), ...Object.keys(family), ...Object.keys(enemies), ...Object.keys(divine)];
  const others = npcs.filter(n => !allCategorized.includes(n));

  let section = `### Key Allies

| NPC | Role |
|-----|------|`;
  for (const [npc, role] of Object.entries(allies)) {
    if (npcs.includes(npc)) {
      section += `\n| [[${npc}\\|${displayName(npc)}]] | ${role} |`;
    }
  }

  section += `

### Family

| NPC | Relation |
|-----|----------|`;
  for (const [npc, relation] of Object.entries(family)) {
    if (npcs.includes(npc)) {
      section += `\n| [[${npc}\\|${displayName(npc)}]] | ${relation} |`;
    }
  }

  section += `

### Enemies

| NPC | Role |
|-----|------|`;
  for (const [npc, role] of Object.entries(enemies)) {
    if (npcs.includes(npc)) {
      section += `\n| [[${npc}\\|${displayName(npc)}]] | ${role} |`;
    }
  }

  section += `

### Divine Beings

| Deity | Domain |
|-------|--------|`;
  for (const [npc, domain] of Object.entries(divine)) {
    if (npcs.includes(npc)) {
      section += `\n| [[${npc}\\|${displayName(npc)}]] | ${domain} |`;
    }
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
  const locations = getFilesRecursive('Locations');

  const major = ['Waterdeep', 'Neverwinter', 'Phandalin', 'Daggerford', 'The_Void', 'Dream_Realm_Castellers', 'Dream_Realm', 'Feywild'];
  const waterdeep = ['House_Castellers', 'House_Castellers_Basement', 'House_of_Justice', 'Temple_of_Tharizdun', 'Sated_Satyr_Inn', 'The_Thirsty_Goat', 'Field_of_Triumph', 'The_Peppermint_Minotaur', 'Sevarnas_Magic_Shop'];
  const neverwinter = ['House_of_Knowledge', 'Chapel_of_Oghma', 'House_De_Moray', 'Swiftclock_Home', 'Moonstone_Mask', 'Neverwinter_Castle'];

  const allCategorized = [...major, ...waterdeep, ...neverwinter];
  const others = locations.filter(l => !allCategorized.includes(l));

  let section = `### Major Locations

| Location |
|----------|`;
  for (const loc of major) {
    if (locations.includes(loc)) {
      section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
    }
  }

  section += `

### Waterdeep Locations

| Location |
|----------|`;
  for (const loc of waterdeep) {
    if (locations.includes(loc)) {
      section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
    }
  }

  section += `

### Neverwinter Locations

| Location |
|----------|`;
  for (const loc of neverwinter) {
    if (locations.includes(loc)) {
      section += `\n| [[${loc}\\|${displayName(loc)}]] |`;
    }
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
  const quests = getFilesRecursive('Quests');
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
title: The Icebreakers
type: index
campaign: neverwinter-icebreakers
---

# The Icebreakers Campaign

![[attachments/campaign-image.png]]

**Campaign:** Adventures of Icespire Peak (D&D 5e)
**Party Name:** The Icebreakers

## The Party

${generatePCs()}

## Campaign Overview

The overarching plot involves [[The_Chained|the Chained cult]] attempting to free the imprisoned evil god **[[Tharizdun]]**. Key story elements:
- Corruption mechanics ([[Modred_De_Moray|Modred]]'s blackened fingers, [[Sebastian]]'s fully black hands)
- [[Dream_Realm_Castellers|Dream realm]] infiltrations
- Noble house intrigue ([[House_Castellers]])
- Character family storylines ([[Milo_Swiftclock|Milo]] searching for sister [[Liora_Swiftclock|Liora]], [[Modred_De_Moray|Modred]]'s father issues, [[Clover]]'s kidnapped sister [[Thistle]])
- The antagonist **[[Cora]]** (nicknamed "backflipping bitch") who escapes via triangular portals

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
console.log(`  - NPCs: ${getFilesRecursive('NPCs').length}`);
console.log(`  - Locations: ${getFilesRecursive('Locations').length}`);
console.log(`  - Quests: ${getFilesRecursive('Quests').length}`);
console.log(`  - Loot: ${getFiles('Loot').length}`);
