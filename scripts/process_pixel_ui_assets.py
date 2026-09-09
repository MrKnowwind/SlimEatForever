"""Extract ImageGen masters without redrawing or palette reduction."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "art-source"
OUTPUT = ROOT / "assets" / "pixel"


def grid_cell(image, columns, rows, column, row):
    left = round(image.width * column / columns)
    right = round(image.width * (column + 1) / columns)
    top = round(image.height * row / rows)
    bottom = round(image.height * (row + 1) / rows)
    return image.crop((left, top, right, bottom))


def crop_visible(image, padding=4):
    """Crop transparent margins while preserving ImageGen RGBA pixels verbatim."""
    image = image.convert("RGBA")
    visible_alpha = image.getchannel("A").point(lambda value: 255 if value >= 16 else 0)
    box = visible_alpha.getbbox()
    if not box:
        raise ValueError("ImageGen cell contains no visible subject")
    left = max(0, box[0] - padding)
    top = max(0, box[1] - padding)
    right = min(image.width, box[2] + padding)
    bottom = min(image.height, box[3] + padding)
    return image.crop((left, top, right, bottom))


def crop_to_aspect(image, width, height):
    target = width / height
    current = image.width / image.height
    if current > target:
        new_width = round(image.height * target)
        left = (image.width - new_width) // 2
        return image.crop((left, 0, left + new_width, image.height))
    new_height = round(image.width / target)
    top = (image.height - new_height) // 2
    return image.crop((0, top, image.width, top + new_height))


def save_direct(image, relative_path):
    target = OUTPUT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    crop_visible(image).save(target, optimize=True)


def process_icon_sheet(filename, columns, rows, names):
    sheet = Image.open(SOURCE / filename).convert("RGBA")
    for index, name in enumerate(names):
        cell = grid_cell(sheet, columns, rows, index % columns, index // columns)
        save_direct(cell, Path("ui/skill-icons") / f"{name}.png")


def process_nodes():
    sheet = Image.open(SOURCE / "nodes.png").convert("RGBA")
    for index, state in enumerate(("owned", "available", "locked", "unknown")):
        save_direct(grid_cell(sheet, 4, 1, index, 0), Path("ui/nodes") / f"node-{state}.png")


def process_panel_and_buttons():
    sheet = Image.open(SOURCE / "panel-buttons.png").convert("RGBA")
    split = round(sheet.height * 0.70)
    save_direct(sheet.crop((0, 0, sheet.width, split)), "ui/panels/panel-frame.png")
    lower = sheet.crop((0, split, sheet.width, sheet.height))
    for index, state in enumerate(("normal", "hover", "pressed", "disabled")):
        save_direct(grid_cell(lower, 4, 1, index, 0), Path("ui/buttons") / f"button-{state}.png")


def process_production_props():
    sheet = Image.open(SOURCE / "production-props.png").convert("RGBA")
    for index, name in enumerate(("salt-mine", "pond")):
        save_direct(grid_cell(sheet, 2, 1, index, 0), Path("props") / f"{name}.png")


def process_scene_ui():
    sheet = Image.open(SOURCE / "scene-ui.png").convert("RGBA")
    names = ("hud-frame", "result-panel", "button-confirm", "button-secondary")
    for index, name in enumerate(names):
        save_direct(grid_cell(sheet, 2, 2, index % 2, index // 2), Path("ui/scene") / f"{name}.png")


def process_main_props():
    sheet = Image.open(SOURCE / "main-props.png").convert("RGBA")
    outputs = ("props/bone-pile.png", "items/bone.png", "items/salt.png", "items/fish.png")
    for index, output in enumerate(outputs):
        save_direct(grid_cell(sheet, 2, 2, index % 2, index // 2), output)


def process_dungeon_background():
    background = Image.open(SOURCE / "dungeon-background.png").convert("RGBA")
    target = OUTPUT / "backgrounds/dungeon.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    crop_to_aspect(background, 1160, 720).save(target, optimize=True)


def process_battle_scene_kit():
    sheet = Image.open(SOURCE / "battle-scene-kit-v1.png").convert("RGBA")

    def save_hard_cutout(image, output):
        image = crop_visible(image, padding=0)
        alpha = image.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
        image.putalpha(alpha)
        target = OUTPUT / output
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)

    outputs = (
        (0, 0, "props/battle-platform-slime.png"),
        (1, 0, "props/battle-platform-enemy.png"),
        (2, 0, "ui/scene/encounter-crest.png"),
        (0, 1, "effects/slime-impact.png"),
        (1, 1, "effects/weapon-slash.png"),
    )
    for column, row, output in outputs:
        save_hard_cutout(grid_cell(sheet, 3, 2, column, row), output)

    tokens = grid_cell(sheet, 3, 2, 2, 1)
    split = tokens.width // 2
    save_hard_cutout(tokens.crop((0, 0, split, tokens.height)), "ui/scene/timeline-slime.png")
    save_hard_cutout(tokens.crop((split, 0, tokens.width, tokens.height)), "ui/scene/timeline-enemy.png")


def process_battle_portraits():
    sheet = Image.open(SOURCE / "battle-timeline-portraits-v1.png").convert("RGBA")
    for index, role in enumerate(("rookie", "hunter", "guard", "archer", "oracle")):
        cell = crop_visible(grid_cell(sheet, 5, 1, index, 0), padding=0)
        alpha = cell.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
        cell.putalpha(alpha)
        target = OUTPUT / "ui" / "scene" / f"timeline-{role}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        cell.save(target, optimize=True)


def process_battle_tree_ui_kit():
    sheet = Image.open(SOURCE / "battle-tree-ui-kit-v2.png").convert("RGBA")
    outputs = (
        (0, 0, "props/battle-platform-slime-v2.png"),
        (1, 0, "props/battle-platform-enemy-v2.png"),
        (2, 0, "ui/scene/timeline-active.png"),
        (0, 1, "ui/tree/detail-panel.png"),
        (1, 1, "ui/tree/complete-button.png"),
        (2, 1, "ui/tree/dialog-button.png"),
    )
    for column, row, output in outputs:
        cell = crop_visible(grid_cell(sheet, 3, 2, column, row), padding=0)
        alpha = cell.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
        cell.putalpha(alpha)
        target = OUTPUT / output
        target.parent.mkdir(parents=True, exist_ok=True)
        cell.save(target, optimize=True)


def process_tree_complete_button():
    image = crop_visible(Image.open(SOURCE / "tree-complete-button-v2.png").convert("RGBA"), padding=8)
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 64 else 0)
    image.putalpha(alpha)
    target = OUTPUT / "ui" / "tree" / "complete-button-v2.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def process_tree_detail_panel():
    image = crop_visible(Image.open(SOURCE / "tree-detail-panel-v3.png").convert("RGBA"), padding=8)
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 64 else 0)
    image.putalpha(alpha)
    target = OUTPUT / "ui" / "tree" / "detail-panel-v3.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def process_slime_sheet(source_name, output_name, columns, rows):
    """Normalize an authored animation grid into equal 128px Phaser frames."""
    source = Image.open(SOURCE / source_name).convert("RGBA")
    frames = []
    for row in range(rows):
        for column in range(columns):
            left = round(source.width * column / columns)
            top = round(source.height * row / rows)
            right = round(source.width * (column + 1) / columns)
            bottom = round(source.height * (row + 1) / rows)
            frames.append(crop_visible(source.crop((left, top, right, bottom)), padding=0))

    # One scale for the entire sheet preserves squash/stretch differences between
    # frames and prevents the character from visibly changing volume mid-action.
    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    scale = min(112 / max_width, 112 / max_height)
    sheet = Image.new("RGBA", (128 * columns, 128 * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        frame = frame.resize(size, Image.Resampling.NEAREST)
        column = index % columns
        row = index // columns
        sheet.alpha_composite(frame, (column * 128 + (128 - size[0]) // 2, row * 128 + 120 - size[1]))
    target = OUTPUT / "characters" / output_name
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, optimize=True)


def process_enemy_sheet(source_name, output_name, columns=4, rows=4):
    source = Image.open(SOURCE / source_name).convert("RGBA")
    frames = []
    for row in range(rows):
        for column in range(columns):
            frames.append(crop_visible(grid_cell(source, columns, rows, column, row), padding=0))
    scale = min(148 / max(frame.width for frame in frames), 148 / max(frame.height for frame in frames))
    sheet = Image.new("RGBA", (160 * columns, 160 * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        frame = frame.resize(size, Image.Resampling.NEAREST)
        column = index % columns
        row = index // columns
        sheet.alpha_composite(frame, (column * 160 + (160 - size[0]) // 2, row * 160 + 154 - size[1]))
    target = OUTPUT / "characters" / output_name
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, optimize=True)


def main():
    process_icon_sheet("skill-icons-core.png", 3, 2, [
        "nutrition", "production", "extraPile", "evolution", "largeBone", "betterBone",
    ])
    process_icon_sheet("skill-icons-late.png", 2, 2, [
        "bonusProduction", "boneSearch", "fusedPile", "dye",
    ])
    process_icon_sheet("skill-icons-food.png", 2, 2, [
        "newFood", "saltMine", "pond", "unknown",
    ])
    process_nodes()
    process_panel_and_buttons()
    process_production_props()
    process_scene_ui()
    process_main_props()
    process_dungeon_background()
    process_battle_scene_kit()
    process_battle_portraits()
    process_battle_tree_ui_kit()
    process_tree_complete_button()
    process_tree_detail_panel()
    process_slime_sheet("slime-micro-animation-v3.png", "slime-micro-v2.png", 4, 5)
    process_slime_sheet("slime-evolved-animation-v2.png", "slime-evolved-v2.png", 4, 7)
    process_enemy_sheet("enemy-rookie-animation-v1.png", "enemy-rookie-v1.png")
    process_enemy_sheet("enemy-hunter-animation-v1.png", "enemy-hunter-v1.png")


if __name__ == "__main__":
    main()
