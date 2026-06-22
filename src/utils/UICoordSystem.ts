export class UICoordSystem {
    static getTopRight(offsetX = 0, offsetY = 0) {
        return { x: 800 - offsetX, y: offsetY };
    }
}