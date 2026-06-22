const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 667;

export const LayoutUtils = {
    getScale: (): number => {
        return Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
    },

    vw: (px: number): number => {
        return (px / DESIGN_WIDTH) * 100;
    },

    vh: (px: number): number => {
        return (px / DESIGN_HEIGHT) * 100;
    },

    toScaledPx: (px: number): number => {
        return px * LayoutUtils.getScale();
    }
};
