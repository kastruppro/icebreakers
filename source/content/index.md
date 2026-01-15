---
type: index
campaign: neverwinter-icebreakers
---

# The Icebreakers Campaign

**Campaign:** Adventures of Icespire Peak (D&D 5e)
**Party Name:** The The Icebreakers

## The Party

| Character               | Player | Race     | Class            |
| ----------------------- | ------ | -------- | ---------------- |
| [[Milo Swiftclock]]     | Tobias | Harengon | Chronurgy Wizard |
| [[Sir Modred De Moray]] | Franz  | Human    | Eldritch Knight  |
| [[Jaspar Starshade]]    | Henrik | Aasimar  | Rogue            |
| [[Clover]]              | Bjørn  | Harengon | Moon Druid       |

## Campaign Overview

The overarching plot involves cultists attempting to free the imprisoned evil god **Tharizdun**. Key story elements:
- Corruption mechanics (Modred's 
- blackened fingers, Sebastian's fully black hands)
- Dream realm infiltrations
- Noble house intrigue (House Castellers)
- Character family storylines (Milo searching for sister Liora, Modred's father issues)
- The antagonist **Cora** (nicknamed "backflipping bitch") who escapes via triangular portals

---

## Sessions

```dataview
TABLE session as "#", date as "Date", file.link as "Title"
FROM "Campaigns/The-Icebreakers/Sessions"
WHERE type = "session"
SORT session DESC
```

---

## Active Quests

```dataview
LIST
FROM "Campaigns/The-Icebreakers/Quests"
WHERE status = "active"
```

---

## NPCs by Status

### Allies & Neutral

```dataview
TABLE role as "Role", location as "Location", ("Session " + last_seen) as "Last Seen"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE status = "alive" AND (relationship = "ally" OR relationship = "neutral")
SORT name ASC
```

### Enemies

```dataview
TABLE role as "Role", location as "Location"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE status = "alive" AND relationship = "enemy"
SORT name ASC
```

### Deceased

```dataview
TABLE role as "Role", ("Session " + first_met) as "First Met"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE status = "dead"
SORT name ASC
```

### By Family/House

```dataview
TABLE role as "Role", relationship as "Relation", status as "Status"
FROM "Campaigns/The-Icebreakers/NPCs"
WHERE family
GROUP BY family
```

---

## Recent Locations

### Main Locations
```dataview
TABLE region as "Region", ("Session " + last_visited) as "Last Visited"
FROM "Campaigns/The-Icebreakers/Locations"
WHERE !parent_location
SORT last_visited DESC
LIMIT 10
```

### Sub-Locations (Rooms, Areas)
```dataview
TABLE parent_location as "Part Of", ("Session " + last_visited) as "Last Visited"
FROM "Campaigns/The-Icebreakers/Locations"
WHERE parent_location
SORT last_visited DESC
LIMIT 5
```

---

## Loot & Items

```dataview
TABLE holder as "Held By", properties as "Properties"
FROM "Campaigns/The-Icebreakers/Loot"
SORT file.mtime DESC
```

---

## Quick Links

### Context Files
- [[Context/Summary/|Quick Summaries]] - For fast Claude context loading
- [[Context/Detailed/|Full Details]] - For comprehensive analysis

### Songs
- [[Songs/|Song Events & Lyrics]] - Suno generation files

### Voiceovers
- [[Voiceovers/|Dramatic Recaps]] - Audio script files

---

## Unresolved Threads

*Update this section manually after each session:*

### Active Mysteries
- [ ] What is "downstairs" at House Castellers?
- [ ] Why does Sebastian have worse corruption than Modred?
- [ ] How did Sebastian travel from Neverwinter so fast?
- [ ] Where are the four Tharizdun ruins around Waterdeep?
- [ ] Will Cora find Arthur despite the warning?

### Personal Quests
- [ ] **Milo**: Find sister Liora
- [ ] **Modred**: Reconcile with/confront father Godwin
- [ ] **Jaspar**: Explore prophetic dreams
- [ ] **Clover**: Rescue sister Thistle from House Castellers
