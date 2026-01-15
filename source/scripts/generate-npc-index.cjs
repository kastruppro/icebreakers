#!/usr/bin/env node
/**
 * Generates a static NPC_Index.md from Data/NPCs.csv
 * Includes ALL NPCs from CSV, not just ones with individual files.
 * Run during GitHub Actions build.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');
const CSV_PATH = path.join(CONTENT_DIR, 'Data/NPCs.csv');
const OUTPUT_PATH = path.join(CONTENT_DIR, 'NPC_Index.md');

// Parse CSV (simple parser for this format)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

// Check if NPC has individual file
function hasFile(name) {
  const filename = name.replace(/ /g, '_').replace(/[()]/g, '');
  const filepath = path.join(CONTENT_DIR, 'NPCs', `${filename}.md`);
  return fs.existsSync(filepath);
}

// Create wiki link (links to file if exists, otherwise plain text)
function npcLink(name) {
  const filename = name.replace(/ /g, '_').replace(/[()]/g, '');
  if (hasFile(name)) {
    return `[[${filename}\\|${name}]]`;
  }
  return name;
}

// Categorize NPCs
function categorizeNPCs(npcs) {
  const categories = {
    party: [],
    allies: [],
    family: [],
    enemies: [],
    divine: [],
    other: []
  };

  // Keywords for categorization
  const enemyKeywords = ['cultist', 'cult', 'enemy', 'claimed', 'corrupted', 'evil', 'tharizdun'];
  const allyKeywords = ['ally', 'friend', 'rescued', 'party member', 'helped', 'paladin', 'cleric'];
  const familyKeywords = ['sister', 'brother', 'father', 'mother', 'family', 'swiftclock', 'de moray'];
  const divineKeywords = ['god', 'goddess', 'divine', 'deity'];
  const partyKeywords = ['party member', 'pc'];

  for (const npc of npcs) {
    const name = npc.Name?.toLowerCase() || '';
    const role = npc['Role/Description']?.toLowerCase() || '';
    const status = npc.Status?.toLowerCase() || '';
    const notable = npc['Notable Info']?.toLowerCase() || '';
    const combined = `${name} ${role} ${status} ${notable}`;

    // Check categories in order of priority
    if (partyKeywords.some(k => combined.includes(k))) {
      categories.party.push(npc);
    } else if (divineKeywords.some(k => combined.includes(k))) {
      categories.divine.push(npc);
    } else if (familyKeywords.some(k => combined.includes(k))) {
      categories.family.push(npc);
    } else if (enemyKeywords.some(k => combined.includes(k))) {
      categories.enemies.push(npc);
    } else if (allyKeywords.some(k => combined.includes(k))) {
      categories.allies.push(npc);
    } else {
      categories.other.push(npc);
    }
  }

  return categories;
}

// Generate table for category
function generateTable(npcs, columns) {
  if (npcs.length === 0) return '*None*';

  const headers = columns.map(c => c.header).join(' | ');
  const separator = columns.map(() => '---').join(' | ');

  let table = `| ${headers} |\n| ${separator} |`;

  for (const npc of npcs) {
    const row = columns.map(c => c.getValue(npc)).join(' | ');
    table += `\n| ${row} |`;
  }

  return table;
}

// Main generation
function generate() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`NPCs.csv not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const npcs = parseCSV(csvContent);
  const categories = categorizeNPCs(npcs);

  // Column definitions
  const standardColumns = [
    { header: 'Name', getValue: npc => npcLink(npc.Name) },
    { header: 'Race', getValue: npc => npc['Race/Type'] || '-' },
    { header: 'Role', getValue: npc => npc['Role/Description'] || '-' },
    { header: 'Location', getValue: npc => npc['City/Location'] || '-' },
    { header: 'Status', getValue: npc => npc.Status || '-' }
  ];

  const familyColumns = [
    { header: 'Name', getValue: npc => npcLink(npc.Name) },
    { header: 'Race', getValue: npc => npc['Race/Type'] || '-' },
    { header: 'Relation', getValue: npc => npc['Notable Info']?.split(';')[0] || npc['Role/Description'] || '-' },
    { header: 'Status', getValue: npc => npc.Status || '-' }
  ];

  const divineColumns = [
    { header: 'Deity', getValue: npc => npcLink(npc.Name) },
    { header: 'Domain', getValue: npc => npc['Role/Description'] || '-' },
    { header: 'Notable', getValue: npc => npc['Notable Info']?.substring(0, 50) || '-' }
  ];

  const template = `---
type: npc_index
campaign: neverwinter-icebreakers
generated: ${new Date().toISOString().split('T')[0]}
---

# NPC Index

Complete index of all NPCs encountered in The Icebreakers campaign.

> **Note:** NPCs with links have detailed individual files. Others are tracked in the master CSV only.

---

## Party Members

${generateTable(categories.party, standardColumns)}

---

## Family

NPCs related to party member backstories.

${generateTable(categories.family, familyColumns)}

---

## Allies

Friendly NPCs who have helped the party.

${generateTable(categories.allies, standardColumns)}

---

## Enemies

Antagonists and hostile NPCs.

${generateTable(categories.enemies, standardColumns)}

---

## Divine Beings

Gods, goddesses, and divine entities.

${generateTable(categories.divine, divineColumns)}

---

## Other NPCs

Minor characters, shopkeepers, and others.

${generateTable(categories.other, standardColumns)}

---

*Generated from Data/NPCs.csv*
`;

  fs.writeFileSync(OUTPUT_PATH, template);
  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  - Total NPCs: ${npcs.length}`);
  console.log(`  - Party: ${categories.party.length}`);
  console.log(`  - Family: ${categories.family.length}`);
  console.log(`  - Allies: ${categories.allies.length}`);
  console.log(`  - Enemies: ${categories.enemies.length}`);
  console.log(`  - Divine: ${categories.divine.length}`);
  console.log(`  - Other: ${categories.other.length}`);
}

generate();
