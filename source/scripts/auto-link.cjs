#!/usr/bin/env node

/**
 * Auto-Linker Script for D&D Campaign Wiki
 *
 * Finds unlinked mentions of NPCs, locations, PCs, and factions
 * and optionally converts them to wiki links.
 *
 * Usage:
 *   node scripts/auto-link.cjs           # Report only
 *   node scripts/auto-link.cjs --fix     # Auto-fix links
 *   node scripts/auto-link.cjs --dry-run # Show what would change (same as no args)
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const FIX_MODE = process.argv.includes('--fix');

// Folders to scan for known entities
const ENTITY_FOLDERS = ['NPCs', 'Locations', 'PCs', 'Factions', 'Loot'];

// Folders to scan for files that need linking
const SCAN_FOLDERS = ['Sessions', 'Voiceovers'];

// Build index of all known entities
function buildEntityIndex() {
  const entities = [];

  for (const folder of ENTITY_FOLDERS) {
    const folderPath = path.join(CONTENT_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    scanFolder(folderPath, entities);
  }

  return entities;
}

function scanFolder(folderPath, entities) {
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      scanFolder(itemPath, entities);
    } else if (item.endsWith('.md') && !item.startsWith('_')) {
      const entity = parseEntityFile(itemPath, item);
      if (entity) {
        entities.push(entity);
      }
    }
  }
}

function parseEntityFile(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const baseName = fileName.replace('.md', '');

  // Extract name from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let displayName = baseName.replace(/_/g, ' ');

  if (frontmatterMatch) {
    const nameMatch = frontmatterMatch[1].match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      displayName = nameMatch[1].trim();
    }
  }

  // Common words to never use as single-word search terms
  const SKIP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for',
    'is', 'it', 'be', 'as', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'with', 'from', 'into',
    'sir', 'lord', 'lady', 'master', 'sister', 'brother',
    'house', 'temple', 'church', 'field', 'dream', 'crown',
    'frozen', 'void', 'dark', 'book', 'staff', 'ring', 'mask',
    'white', 'black', 'other', 'statue', 'healing', 'dragon', 'castle',
    'thirsty', 'goat', 'sated', 'satyr', 'peppermint', 'minotaur',
    'castellers', 'neverember', 'swiftclock', 'moray', 'starshade'
  ]);

  // Generate search terms (what to look for in text)
  const searchTerms = new Set();

  // Add full display name (always)
  searchTerms.add(displayName);

  // Add filename version if different
  const fileNameVersion = baseName.replace(/_/g, ' ');
  if (fileNameVersion !== displayName) {
    searchTerms.add(fileNameVersion);
  }

  // Add first name only for character names (not locations/items)
  const words = displayName.split(' ');
  if (words.length >= 2) {
    const firstName = words[0];
    const secondWord = words[1];

    // For titled names like "Sir Modred", add just "Modred"
    if (['Sir', 'Lord', 'Lady', 'Master', 'Sister'].includes(firstName)) {
      if (!SKIP_WORDS.has(secondWord.toLowerCase()) && secondWord.length >= 4) {
        searchTerms.add(secondWord);
      }
    }
    // For regular names like "Milo Swiftclock", add "Milo" if it's unique enough
    else if (!SKIP_WORDS.has(firstName.toLowerCase()) && firstName.length >= 4) {
      searchTerms.add(firstName);
    }
  }

  // DON'T add partial names for locations (e.g., don't match "Thirsty" alone)
  // DON'T add "The X" stripped versions - too error-prone

  // Convert to array and sort by length (longest first to match longer phrases first)
  const terms = Array.from(searchTerms)
    .filter(t => t.length >= 4) // Skip short terms
    .filter(t => !SKIP_WORDS.has(t.toLowerCase())) // Skip common words
    .sort((a, b) => b.length - a.length);

  return {
    linkTarget: baseName,
    displayName: displayName,
    searchTerms: terms
  };
}

// Check if a position is inside a wiki link or code block
function isInsideSpecialBlock(content, position) {
  // Check if inside wiki link [[...]]
  const beforePos = content.substring(0, position);
  const afterPos = content.substring(position);

  // Count [[ and ]] before position
  const openBrackets = (beforePos.match(/\[\[/g) || []).length;
  const closeBrackets = (beforePos.match(/\]\]/g) || []).length;

  if (openBrackets > closeBrackets) {
    return true; // Inside a wiki link
  }

  // Check if inside code block ```...```
  const codeBlocks = (beforePos.match(/```/g) || []).length;
  if (codeBlocks % 2 === 1) {
    return true; // Inside a code block
  }

  // Check if inside inline code `...`
  const inlineCode = (beforePos.match(/`/g) || []).length;
  // This is approximate - inline code is tricky

  return false;
}

// Check if the match is already part of a wiki link
function isAlreadyLinked(content, matchStart, matchEnd, term) {
  // Check characters immediately before the match
  const charBefore1 = matchStart > 0 ? content[matchStart - 1] : '';
  const charBefore2 = matchStart > 1 ? content[matchStart - 2] : '';

  // If preceded by [ or [[, it's already in a link
  if (charBefore1 === '[') return true;
  if (charBefore2 === '[' && charBefore1 === '[') return true;

  // Check if preceded by | (display text in a link)
  if (charBefore1 === '|') return true;

  // Check if this is inside a link [[...]] by looking at surrounding context
  const extendedBefore = content.substring(Math.max(0, matchStart - 100), matchStart);
  const extendedAfter = content.substring(matchEnd, Math.min(content.length, matchEnd + 100));

  // If there's an unclosed [[ before us, we're inside a link
  const lastOpen = extendedBefore.lastIndexOf('[[');
  const lastClose = extendedBefore.lastIndexOf(']]');
  if (lastOpen > lastClose) {
    return true;
  }

  // Check if followed by ]] without [[ in between (we're the link target)
  const nextClose = extendedAfter.indexOf(']]');
  const nextOpen = extendedAfter.indexOf('[[');
  if (nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen)) {
    // There's a ]] after us - check if there's a | before it (we might be target or display)
    const beforeClose = extendedAfter.substring(0, nextClose);
    if (!beforeClose.includes('[[')) {
      return true; // We're inside an existing link
    }
  }

  return false;
}

// Find all unlinked mentions in a file
function findUnlinkedMentions(filePath, entities) {
  const content = fs.readFileSync(filePath, 'utf8');
  const mentions = [];

  // Skip frontmatter
  let searchContent = content;
  let offset = 0;
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  if (frontmatterMatch) {
    offset = frontmatterMatch[0].length;
    searchContent = content.substring(offset);
  }

  for (const entity of entities) {
    for (const term of entity.searchTerms) {
      // Create regex for whole word match (case-insensitive)
      const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
      let match;

      while ((match = regex.exec(searchContent)) !== null) {
        const absolutePos = match.index + offset;

        // Skip if inside special block or already linked
        if (isInsideSpecialBlock(content, absolutePos)) continue;
        if (isAlreadyLinked(content, absolutePos, absolutePos + match[0].length, term)) continue;

        // Calculate line number
        const lineNumber = content.substring(0, absolutePos).split('\n').length;

        // Determine the best link format
        let replacement;
        const linkTarget = entity.linkTarget;
        const matchedText = match[0];
        const targetWithoutUnderscores = linkTarget.replace(/_/g, ' ');

        // No display text needed if match equals target (with or without underscores)
        if (matchedText === linkTarget || matchedText === targetWithoutUnderscores) {
          replacement = `[[${linkTarget}]]`;
        } else {
          replacement = `[[${linkTarget}|${matchedText}]]`;
        }

        mentions.push({
          file: filePath,
          line: lineNumber,
          original: match[0],
          replacement: replacement,
          position: absolutePos,
          length: match[0].length,
          entity: entity
        });
      }
    }
  }

  // Remove overlapping matches (keep longest match)
  // Sort by position, then by length (longest first)
  mentions.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return b.original.length - a.original.length;
  });

  const uniqueMentions = [];
  let lastEnd = -1;

  for (const mention of mentions) {
    // Skip if this mention overlaps with a previous one
    if (mention.position < lastEnd) {
      continue;
    }

    uniqueMentions.push(mention);
    lastEnd = mention.position + mention.original.length;
  }

  return uniqueMentions;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply fixes to a file
function applyFixes(filePath, mentions) {
  if (mentions.length === 0) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Apply replacements from end to start (to preserve positions)
  const sortedMentions = [...mentions].sort((a, b) => b.position - a.position);

  for (const mention of sortedMentions) {
    content =
      content.substring(0, mention.position) +
      mention.replacement +
      content.substring(mention.position + mention.length);
  }

  fs.writeFileSync(filePath, content);
}

// Main execution
function main() {
  console.log('Building entity index...');
  const entities = buildEntityIndex();
  console.log(`Found ${entities.length} entities\n`);

  // Debug: show some entities
  // entities.slice(0, 5).forEach(e => console.log(`  ${e.displayName}: ${e.searchTerms.join(', ')}`));

  let totalMentions = 0;
  let filesWithMentions = 0;
  const allMentions = [];

  // Scan files for unlinked mentions
  for (const folder of SCAN_FOLDERS) {
    const folderPath = path.join(CONTENT_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const mentions = findUnlinkedMentions(filePath, entities);

      if (mentions.length > 0) {
        filesWithMentions++;
        totalMentions += mentions.length;

        const relPath = path.relative(CONTENT_DIR, filePath);

        for (const mention of mentions) {
          console.log(`📝 ${relPath}:${mention.line}`);
          console.log(`   "${mention.original}" → ${mention.replacement}`);
        }

        if (FIX_MODE) {
          applyFixes(filePath, mentions);
          console.log(`   ✓ Fixed ${mentions.length} link(s)\n`);
        } else {
          console.log('');
        }

        allMentions.push(...mentions);
      }
    }
  }

  // Summary
  console.log('─'.repeat(50));
  if (totalMentions === 0) {
    console.log('✓ No unlinked mentions found!');
  } else if (FIX_MODE) {
    console.log(`✓ Fixed ${totalMentions} mention(s) in ${filesWithMentions} file(s).`);
  } else {
    console.log(`Found ${totalMentions} unlinked mention(s) in ${filesWithMentions} file(s).`);
    console.log('Run with --fix to auto-correct.');
  }

  // Exit with error code if mentions found (for pre-commit hook)
  if (!FIX_MODE && totalMentions > 0) {
    process.exit(1);
  }
}

main();
