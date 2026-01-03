const FONT_URL = "/fonts/Born2bSportyFS.otf";
const FONT_FAMILY = "RetroPixel";

export const loadFonts = async () => {
  const font = new FontFace(FONT_FAMILY, `url(${FONT_URL})`);

  try {
    await font.load();
    document.fonts.add(font);
  } catch (error) {
    console.error("Failed to load font");
  }
};
