colors = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose"
]

strengths = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
]

for c in colors:
  for s in strengths:
    print(f"'bg-{c}-{s}',")
    print(f"'hover:bg-{c}-{s}',")