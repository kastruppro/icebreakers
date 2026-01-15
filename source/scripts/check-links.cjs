#!/usr/bin/env node
/**
 * Wiki Link Validator - Pre-commit hook script
 * Validates all [[wiki-links]] in markdown files exist as files.
 * Also checks for space/underscore mismatches that cause Quartz URL issues.
 *
 * Usage: node scripts/check-links.cjs [--fix]
 *
 * Exit codes:
 *   0 - No broken links found
 *   1 - Broken links found (blocks commit)
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');
const FIX_MODE = process.argv.includes('--fix');

// Get all markdown files recursively
function getAllMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip certain directories
      if (!['node_modules', '.git', '.obsidian'].includes(entry.name)) {
        getAllMarkdownFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Build index of all available files (for fuzzy matching)
function buildFileIndex(files) {
  const index = new Map();

  for (const file of files) {
    const basename = path.basename(file, '.md');
    const relativePath = path.relative(CONTENT_DIR, file);

    // Index by basename (without extension)
    if (!index.has(basename.toLowerCase())) {
      index.set(basename.toLowerCase(), []);
    }
    index.get(basename.toLowerCase()).push({
      basename,
      relativePath,
      fullPath: file
    });
  }

  return index;
}

// Find similar filenames for suggestions
function findSimilar(target, fileIndex) {
  const targetLower = target.toLowerCase().replace(/_/g, '');
  const suggestions = [];

  for (const [key, files] of fileIndex.entries()) {
    const keyClean = key.replace(/_/g, '');
    // Simple similarity: starts with same prefix or contains target
    if (keyClean.includes(targetLower) || targetLower.includes(keyClean)) {
      suggestions.push(...files.map(f => f.basename));
    }
  }

  return [...new Set(suggestions)].slice(0, 3);
}

// Check if a wiki link target exists
function checkLinkTarget(target, fileIndex, fromFile) {
  // Remove display text if present: [[Target|Display Text]] -> Target
  // Also handle escaped pipe: [[Target\|Display Text]]
  const linkTarget = target.split(/\||\\\|/)[0].trim();

  // Skip external links and anchors
  if (linkTarget.startsWith('http') || linkTarget.startsWith('#')) {
    return { valid: true };
  }

  // Handle path-based links like [[Folder/File]]
  const parts = linkTarget.split('/');
  const filename = parts[parts.length - 1];

  // Check if file exists
  const lookup = filename.toLowerCase();
  if (fileIndex.has(lookup)) {
    const resolved = fileIndex.get(lookup)[0].basename;
    // Warn if link uses spaces but file uses underscores (Quartz URL mismatch)
    if (filename.includes(' ') && resolved.includes('_')) {
      return {
        valid: false,
        mismatch: true,
        resolved,
        suggestions: [resolved]
      };
    }
    return { valid: true, resolved };
  }

  // Try with underscores replaced by spaces and vice versa
  const withUnderscores = lookup.replace(/ /g, '_');
  const withSpaces = lookup.replace(/_/g, ' ');

  if (fileIndex.has(withUnderscores)) {
    const resolved = fileIndex.get(withUnderscores)[0].basename;
    // Link uses spaces, file uses underscores - will cause Quartz URL mismatch
    if (filename.includes(' ')) {
      return {
        valid: false,
        mismatch: true,
        resolved,
        suggestions: [resolved]
      };
    }
    return { valid: true, resolved };
  }
  if (fileIndex.has(withSpaces)) {
    return { valid: true, resolved: fileIndex.get(withSpaces)[0].basename };
  }

  // Not found - get suggestions
  const suggestions = findSimilar(filename, fileIndex);
  return { valid: false, suggestions };
}

// Extract all wiki links from content (excludes embeds ![[...]])
function extractWikiLinks(content) {
  const links = [];
  // Use negative lookbehind to exclude embeds (preceded by !)
  const regex = /(?<!!)\[\[([^\]]+)\]\]/g;
  let match;
  let lineNum = 1;
  let lastIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    // Count newlines to get line number
    const textBefore = content.substring(lastIndex, match.index);
    lineNum += (textBefore.match(/\n/g) || []).length;
    lastIndex = match.index;

    links.push({
      raw: match[0],
      target: match[1],
      line: lineNum,
      index: match.index,
      length: match[0].length
    });
  }

  return links;
}

// Apply fixes to a file
function applyFixes(filePath, fixes) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Sort fixes by index descending (fix from end to preserve positions)
  fixes.sort((a, b) => b.index - a.index);

  for (const fix of fixes) {
    const before = content.substring(0, fix.index);
    const after = content.substring(fix.index + fix.length);
    content = before + fix.replacement + after;
  }

  fs.writeFileSync(filePath, content);
}

// Main validation
function validateLinks() {
  console.log('Checking wiki links...\n');

  const files = getAllMarkdownFiles(CONTENT_DIR);
  const fileIndex = buildFileIndex(files);
  const brokenLinks = [];
  const fixesByFile = new Map();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const links = extractWikiLinks(content);
    const relativePath = path.relative(CONTENT_DIR, file);

    for (const link of links) {
      const result = checkLinkTarget(link.target, fileIndex, file);

      if (!result.valid) {
        const displayTarget = link.target.split(/\||\\\|/)[0];
        const displayText = link.target.includes('|') ? link.target.split(/\||\\\|/)[1] : null;

        brokenLinks.push({
          file: relativePath,
          fullPath: file,
          line: link.line,
          link: link.target,
          suggestions: result.suggestions,
          mismatch: result.mismatch || false,
          index: link.index,
          length: link.length
        });

        // Build fix for mismatches
        if (result.mismatch && result.resolved) {
          if (!fixesByFile.has(file)) {
            fixesByFile.set(file, []);
          }
          // Keep original display text if present, otherwise use the spaced version
          const newDisplayText = displayText || displayTarget;
          const replacement = `[[${result.resolved}|${newDisplayText}]]`;
          fixesByFile.get(file).push({
            index: link.index,
            length: link.length,
            replacement
          });
        }
      }
    }
  }

  // Report results
  if (brokenLinks.length === 0) {
    console.log('✓ All wiki links are valid!\n');
    console.log(`Checked ${files.length} files.`);
    return 0;
  }

  console.log('Broken links found:\n');

  for (const broken of brokenLinks) {
    const displayTarget = broken.link.split(/\||\\\|/)[0];
    console.log(`❌ ${broken.file}:${broken.line}`);
    console.log(`   Link: [[${displayTarget}]]`);

    if (broken.mismatch) {
      console.log(`   ⚠️  Space/underscore mismatch! Quartz will generate wrong URL.`);
      console.log(`   Use: [[${broken.suggestions[0]}]] or [[${broken.suggestions[0]}|${displayTarget}]]`);
    } else if (broken.suggestions.length > 0) {
      console.log(`   Did you mean: ${broken.suggestions.map(s => `[[${s}]]`).join(', ')}?`);
    }
    console.log('');
  }

  console.log(`Found ${brokenLinks.length} broken link(s) in ${files.length} files.`);

  // Apply fixes if in fix mode
  if (FIX_MODE && fixesByFile.size > 0) {
    console.log('\nApplying fixes...');
    let fixCount = 0;
    for (const [filePath, fixes] of fixesByFile) {
      applyFixes(filePath, fixes);
      fixCount += fixes.length;
      console.log(`  ✓ Fixed ${fixes.length} link(s) in ${path.relative(CONTENT_DIR, filePath)}`);
    }
    console.log(`\n✓ Fixed ${fixCount} space/underscore mismatch(es).`);

    // Check for remaining broken links (non-fixable)
    const unfixable = brokenLinks.filter(b => !b.mismatch);
    if (unfixable.length > 0) {
      console.log(`\n⚠️  ${unfixable.length} broken link(s) remain (files don't exist).`);
      console.log('Commit blocked.\n');
      return 1;
    }
    return 0;
  }

  console.log('Commit blocked.\n');
  if (fixesByFile.size > 0) {
    console.log('Run with --fix to auto-fix space/underscore mismatches.\n');
  }

  return 1;
}

// Run
process.exit(validateLinks());
