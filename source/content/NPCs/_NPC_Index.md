---
type: index
campaign: neverwinter-icebreakers
---

# NPC Index

## All NPCs by Status

### Living NPCs

```dataview
TABLE role as "Role", location as "Location", relationship as "Relationship", last_seen as "Last Seen"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND status = "alive"
SORT name ASC
```

### Divine Beings

```dataview
TABLE role as "Role"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND status = "divine"
SORT name ASC
```

### Deceased NPCs

```dataview
TABLE role as "Role", first_met as "First Met"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND status = "dead"
SORT name ASC
```

---

## NPCs by Relationship

### Allies

```dataview
LIST
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND relationship = "ally"
SORT name ASC
```

### Enemies

```dataview
LIST
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND relationship = "enemy"
SORT name ASC
```

### Neutral

```dataview
LIST
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE type = "npc" AND relationship = "neutral"
SORT name ASC
```

---

## Quick Reference

For the full NPC database in CSV format, see:
`Campaign Data/Campaign_NPCs_Complete_Updated.csv`
