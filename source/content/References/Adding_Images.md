# Adding Images to the Campaign Wiki

This guide explains how to add images so they work in both Obsidian and the Quartz website.

## Quick Steps

1. **Save the image** to `source/content/attachments/`
2. **Use a descriptive filename** (e.g., `npc-name.png`, not `IMG_12345.png`)
3. **Reference in markdown** using: `![[attachments/filename.png]]`

## File Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| PC portraits | `pcname.jpeg` | `milo.jpeg` |
| NPC portraits | `npcname.png` | `cora.png` |
| Location images | `locationname1.png` | `waterdeep1.png` |
| Session images | `sessionXX.png` | `session17.png` |
| Items/Other | `descriptive-name.png` | `tyrs-gauntlets.png` |

## Why This Works

Quartz (the static site generator) only has access to files inside `source/content/`. Images stored elsewhere (like the parent DnD folder or Obsidian's default attachment location) won't be included in the build.

## Example

```markdown
# Cora

![[attachments/cora.png]]

## Quick Reference
...
```

## Troubleshooting

**Image not showing on website?**
- Check the image is in `source/content/attachments/`
- Verify the path starts with `attachments/` (not a full path)
- Ensure filename matches exactly (case-sensitive)

**Image not showing in Obsidian?**
- The `![[attachments/filename]]` syntax should work in Obsidian too
- If not, check Obsidian's attachment folder settings
