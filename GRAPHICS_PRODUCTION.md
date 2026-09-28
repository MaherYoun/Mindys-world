# Mindy's World: high-fidelity game production brief

The included web and Capacitor game is a playable, original stylized prototype. It has third-person walking, sprinting, a companion, a world map, flowers, orange trees, a journey gallery and account sync. Its procedural WebGL geometry is deliberately small enough to load on phones. It is not a PUBG-quality 3D production or a full model of every real city.

## The intended look

- A warm, cinematic fantasy adventure: expressive characters, sunset orange, luminous teal navigation, sunflower fields, orange groves, guild architecture, and futuristic light structures. Keep the art original; do not copy Fairy Tail or PUBG characters, environments, logos, audio or meshes.
- A character Mindy can walk with in a close third-person camera. Natural head and body turns, polished walk/run/idle animations, subtle hand motion, foot contact, and a companion that follows without snapping.
- A central travel hub that displays *visited* places separately from future plans. Country and city chapters can reuse modular buildings and vegetation, then add distinct landmarks as custom art is produced. Diary text remains private and appears only by choice.
- A realistic Earth silhouette for navigation, with deliberately illustrated terrain and clearly glowing destination markers. Place markers are approximate game navigation points, not street directions.

## Production work for a high-fidelity release

1. Make approved character and environment concept art, then model and rig the player, companion options, flowers, orange trees, buildings and travel hub. Prepare original walk, run, turn, idle and interaction clips.
2. Build the world in a dedicated 3D game engine and import optimized models, materials, animation clips, lighting and atmospheric effects. Use the existing web prototype to validate gameplay and interaction flow while art is being created.
3. Prepare mobile and desktop quality levels. Use low-detail substitutes for distant objects, compressed textures, baked/static lighting where appropriate, culling and scene streaming. Measure frame rate and memory on an actual iPhone and Android device, then tune until both are comfortable to play.
4. Reconnect the existing save/account schema, diary and per-place companion data. Migrate the older local browser save key instead of silently discarding progress. Test two-device sync, offline edits, import/export and account deletion after the renderer changes.
5. Capture real screenshots from release builds, complete native signing and store submissions, and keep the website live for browser play.

The main unknowns are the art budget, target phones, which cities receive unique environments, and redistribution rights for the supplied Earth textures. Those choices determine the build size and quality level. The current project does not include engine project files or store-signed builds.
