// A small curated library of real photos (Unsplash). Every ID below was checked to
// exist and to match its category. The AI is told to use ONLY these, and the visual
// editor offers them in an image picker.

export const PHOTOS: Record<string, string[]> = {
  business: ["1497366216548-37526070297c", "1497366811353-6870744d04b2", "1521791136064-7986c2920216", "1522071820081-009f0129c71c", "1542744173-8e7e53415bb0", "1556761175-5973dc0f32e7"],
  office: ["1486406146926-c627a92ad1ab", "1551836022-d5d88e9218df"],
  tech: ["1460925895917-afdab827c52f", "1516321318423-f06f85e504b3", "1519389950473-47ba0277781c", "1531297484001-80022131f5a1", "1551288049-bebda4e38f71"],
  cafe: ["1495474472287-4d71bcdd2085", "1501339847302-ac426a4a7cbb", "1554118811-1e0d58224f24"],
  food: ["1414235077428-338989a2e8c0", "1504674900247-0877df9cc836", "1517248135467-4c7edcad34c4", "1555396273-367ea4eb4db5"],
  people: ["1438761681033-6461ffad8d80", "1472099645785-5658abf4ff4e", "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e", "1507003211169-0a1dd7228f2d", "1534528741775-53994a69daeb", "1573496359142-b8d87734a5a2"],
  nature: ["1441974231531-c6227db76b6e", "1469474968028-56623f02e42e", "1470071459604-3b5ec3a7fe05", "1506744038136-46273834b3fb"],
  fitness: ["1534438327276-14e5300c3a48", "1544367567-0f2fcb009e0b", "1571019613454-1cb2f99b2d8b"],
  health: ["1576091160399-112ba8d25d1d", "1631217868264-e5b90bb7e133"],
  education: ["1503676260728-1c00da094a0b", "1523240795612-9a054b0db644"],
  event: ["1511795409834-ef04bbd61622", "1519167758481-83f550bb49b3"],
  product: ["1505740420928-5e560c06d30e", "1523275335684-37898b6baf30", "1542291026-7eec264c27ff"],
  shop: ["1441986300917-64674bd600d8"],
  realestate: ["1560518883-ce09059eeffa", "1564013799919-ab600027ffc6"],
};

export const photoUrl = (id: string, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`;

/** Compact catalog for the system prompt: "category: id, id, ..." */
export function photoCatalog(): string {
  return Object.entries(PHOTOS)
    .map(([cat, ids]) => `${cat}: ${ids.join(", ")}`)
    .join("\n");
}
