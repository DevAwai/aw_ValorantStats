let bettingOpen = false;

function isBettingOpen() {
    return bettingOpen;
}

function setBettingOpen(state) {
    bettingOpen = state;
}

module.exports = { isBettingOpen, setBettingOpen };