/** Text in die Zwischenablage; false, wenn der Browser es ablehnt. */
export async function copyText(nav: Pick<Navigator, 'clipboard'>, text: string): Promise<boolean> {
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
