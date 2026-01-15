#!/usr/bin/env node
/**
 * Wiki Link Validator - Pre-commit hook script
 * Validates all [[wiki-links]] in markdown files exist as files.
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
    return { valid: true, resolved: fileIndex.get(lookup)[0].basename };
  }

  // Try with underscores replaced by spaces and vice versa
  const withUnderscores = lookup.replace(/ /g, '_');
  const withSpaces = lookup.replace(/_/g, ' ');

  if (fileIndex.has(withUnderscores)) {
    return { valid: true, resolved: fileIndex.get(withUnderscores)[0].basename };
  }
  if (fileIndex.has(withSpaces)) {
    return { valid: true, resolved: fileIndex.get(withSpaces)[0].basename };
  }

  // Not found - get suggestions
  const suggestions = findSimilar(filename, fileIndex);
  return { valid: false, suggestions };
}

// Extract all wiki links from content
function extractWikiLinks(content) {
  const links = [];
  const regex = /\[\[([^\]]+)\]\]/g;
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
      index: match.index
    });
  }

  return links;
}

// Main validation
function validateLinks() {
  console.log('Checking wiki links...\n');

  const files = getAllMarkdownFiles(CONTENT_DIR);
  const fileIndex = buildFileIndex(files);
  const brokenLinks = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const links = extractWikiLinks(content);
    const relativePath = path.relative(CONTENT_DIR, file);

    for (const link of links) {
      const result = checkLinkTarget(link.target, fileIndex, file);

      if (!result.valid) {
        brokenLinks.push({
          file: relativePath,
          line: link.line,
          link: link.target,
          suggestions: result.suggestions
        });
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

    if (broken.suggestions.length > 0) {
      console.log(`   Did you mean: ${broken.suggestions.map(s => `[[${s}]]`).join(', ')}?`);
    }
    console.log('');
  }

  console.log(`Found ${brokenLinks.length} broken link(s) in ${files.length} files.`);
  console.log('Commit blocked.\n');

  return 1;
}

// Run
process.exit(validateLinks());
