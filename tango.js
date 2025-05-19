// TODO:
// - [x] Make it so that you can't change the pre-filled-in pieces
// - [x] Timer
// - [x] Say congrats
// - [x] Error checking if the board isn't right after a second
// - [x] Can't change after it's complete
// - [x] Clear button
// - [x] Undo button
// - [x] = and x
// - [x] host on server so everyone else can play too!
// - [x] Make animations when you complete
// - [ ] Make the animations for buttons and cells
// - [ ] `Share` button when you complete a puzzle that copies the snippet to your clipboard
// - [ ] Hide `Clear Undo Pause` when complete, maybe a modal!
// - [ ] Pause button
// - [ ] Seeds so that you can race your friends
// - [ ] Rolling average
// - [ ] Size control
// - [ ] Store prefered emojis in cookie

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const isEasternTime = (
    timeZone === "America/New_York" ||
    timeZone === "America/Detroit" ||
    timeZone === "America/Toronto" // Optional: include if you want Canadian Eastern
);

const EMOJI_ONE = isEasternTime ? '🍞' : '🟠'
const EMOJI_TWO = isEasternTime ? '💖' : '🔵'

const EQ_SYMBOL = '='
const NEQ_SYMBOL = 'X'

class Puzzle {
    constructor(size) {
        this.size = size;
        this.board = make_2D_array(this.size, null)
        this.fixed = make_2D_array(this.size, false)
        this.horizontal = make_2D_array_dim(this.size, this.size - 1, null)
        this.vertical = make_2D_array_dim(this.size - 1, this.size, null)
        this.memo = new Map()
        this.complete = false
        this.is_bad = false
    }

    get_value(i, j) {
        return this.board[i][j]
    }

    set_value(value, i, j) {
        if (!this.fixed[i][j]) {
            this.board[i][j] = value
        }
    }

    clear() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                this.set_value(null, i, j)
            }
        }
    }

    is_fixed(i, j) {
        return this.fixed[i][j]
    }

    bad() {
        return this.is_bad;
    }

    generate() {
        this.puzzle_complete = false

        while (true) {
            this._generate_random_board()
            if (this.validate_full()) break
        }

        // These have to be before we remove stuff
        this._fill_horiz()
        this._fill_vert()

        this.fixed = make_2D_array(this.size, false)
        for (let x = 0; x < 1; x += 1) {
            const positions = get_shuffled_positions(this.size)

            for (const [i, j] of positions) {
                const original = this.board[i][j]
                this.board[i][j] = null
                const solutions = this._count_solutions()
                if (solutions !== 1) {
                    this.board[i][j] = original
                    this.fixed[i][j] = true
                }
            }
        }
    }

    validate_full() {
        let retval = true

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (!this.validate_partial(i, j)) {
                    retval = false
                }
            }
        }

        return retval
    }

    _generate_random_board() {
        while (true) {
            this._clear_forced()

            // Check to see what you can place in each position
            let position = get_shuffled_positions(this.size)
            let is_busted = false
            for (const [i, j] of position) {
                // Check to see what you can place there
                // TODO: This could be abstracted away to just return a list of what you can place
                this.board[i][j] = EMOJI_ONE
                let could_place_bread = this.validate_partial(i, j)
                this.board[i][j] = EMOJI_TWO
                let could_place_heart = this.validate_partial(i, j)

                if (could_place_bread && could_place_heart) {
                    this.board[i][j] = Math.random() < 0.5 ? EMOJI_ONE : EMOJI_TWO
                } else if (could_place_bread) {
                    this.board[i][j] = EMOJI_ONE
                } else if (could_place_heart) {
                    this.board[i][j] = EMOJI_TWO
                } else {
                    is_busted = true
                }
            }
            if (is_busted) {
                break
            } else if (this.is_complete()) {
                break
            }
        }
    }

    _clear_forced() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                this.board[i][j] = null
            }
        }
    }

    _fill_horiz() {
        for (let i = 0; i < this.horizontal.length; i += 1) {
            for (let j = 0; j < this.horizontal[0].length; j += 1) {
                if (Math.random() < 0.9) {
                    this.horizontal[i][j] = null
                    continue
                }
                if (this.get_value(i, j) == this.get_value(i + 1, j)) {
                    this.horizontal[i][j] = EQ_SYMBOL
                } else {
                    this.horizontal[i][j] = NEQ_SYMBOL
                }
            }
        }
    }

    _fill_vert() {
        for (let i = 0; i < this.vertical.length; i += 1) {
            for (let j = 0; j < this.vertical[0].length; j += 1) {
                if (Math.random() < 0.9) {
                    this.vertical[i][j] = null
                    continue
                }
                if (this.get_value(i, j) == this.get_value(i, j + 1)) {
                    this.vertical[i][j] = EQ_SYMBOL
                } else {
                    this.vertical[i][j] = NEQ_SYMBOL
                }
            }
        }
    }

    validate_partial(row, col) {
        function listHas3(list) {
            return list.filter(e => e === EMOJI_ONE).length <= (list.length / 2) &&
                list.filter(e => e === EMOJI_TWO).length <= (list.length / 2)
        }

        function no3InRow(list) {
            let counter = 0
            let lastSeen = null
            for (const e of list) {
                if (e === null) {
                    counter = 0
                    lastSeen = null
                    continue
                }
                if (e !== lastSeen) {
                    lastSeen = e
                    counter = 1
                } else {
                    counter++
                    if (counter > 2) return false
                }
            }
            return true
        }

        function match_symbol(value1, value2, symbol) {
            if (value1 === null || value2 === null) {
                return true
            }
            if (symbol == EQ_SYMBOL) {
                return value1 === value2
            } else if (symbol == NEQ_SYMBOL) {
                return value1 !== value2
            }
        }

        let row_passed = true
        let col_passed = true

        // Check that row is correct
        let row_array = this.board[row]
        if (!listHas3(row_array)) {
            row_passed = false
        }
        if (!no3InRow(row_array)) {
            row_passed = false
        }

        if (col < this.size - 1 && this.vertical[row][col]) {
            const me = this.get_value(row, col)
            const other = this.get_value(row, col + 1)
            const symbol = this.vertical[row][col]
            row_passed &&= match_symbol(me, other, symbol)
        }

        if (col > 0 && this.vertical[row][col - 1]) {
            const me = this.get_value(row, col)
            const other = this.get_value(row, col - 1)
            const symbol = this.vertical[row][col - 1]
            row_passed &&= match_symbol(me, other, symbol)
        }

        if (row < this.size - 1 && this.horizontal[row][col]) {
            const me = this.get_value(row, col)
            const other = this.get_value(row + 1, col)
            const symbol = this.horizontal[row][col]
            col_passed &&= match_symbol(me, other, symbol)
        }

        if (row > 0 && this.horizontal[row - 1][col]) {
            const me = this.get_value(row, col)
            const other = this.get_value(row - 1, col)
            const symbol = this.horizontal[row - 1][col]
            col_passed &&= match_symbol(me, other, symbol)
        }

        // Check that column is correct
        const col_array = this.board.map(row_array => row_array[col])
        if (!listHas3(col_array)) {
            col_passed = false
        }
        if (!no3InRow(col_array)) {
            col_passed = false
        }

        return row_passed && col_passed
    }

    _count_solutions(row = 0, col = 0) {
        // Use a unique key for the current board state at this position
        const key = `${row},${col},${this.board.flat().join('')}`;

        // If we've seen this state before, return the cached result
        if (this.memo.has(key)) return this.memo.get(key);

        if (row === this.size) {
            return this.validate_full() ? 1 : 0
        }

        const [nextRow, nextCol] = col < this.size - 1 ? [row, col + 1] : [row + 1, 0]
        if (this.board[row][col] !== null) {
            return this._count_solutions(nextRow, nextCol)
        }

        let count = 0
        for (const piece of [EMOJI_ONE, EMOJI_TWO]) {
            this.board[row][col] = piece
            if (this.validate_full()) {
                count += this._count_solutions(nextRow, nextCol)
            }
        }
        this.board[row][col] = null

        this.memo.set(key, count);
        return count
    }

    is_complete() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === null) {
                    return false
                }
            }
        }
        return true
    }
}

class Game {
    constructor(puzzle) {
        this.puzzle = puzzle
        this.start_time = performance.now()
        this.elapsed_ms = 0
        this.last_timestamp = performance.now()
        this.last_placement_timestamp = 0
        this.placement_history = []
        this.timer = null
    }

    new_puzzle() {
        this.puzzle.generate()
        this.render_html()
        this.recolor()

        this.timer = setInterval(() => this.update_time(), 10)

        this.start_time = performance.now()
        this.elapsed_ms = 0
        this.last_timestamp = performance.now()
        this.last_placement_timestamp = 0
        this.placement_history = []
    }

    render_html() {
        this.table = document.getElementById('board')
        this.table.innerHTML = ''
        for (let i = 0; i < this.puzzle.size; i++) {
            const row = document.createElement('tr')
            for (let j = 0; j < this.puzzle.size; j++) {
                const cell = document.createElement('td')
                cell.classList.add('cell')

                const contentDiv = document.createElement('div')
                contentDiv.className = 'cell-content'
                contentDiv.textContent = this.puzzle.get_value(i, j) || ''
                cell.appendChild(contentDiv)

                const topDiv = document.createElement('div')
                topDiv.className = 'edge-text bottom'
                if (i < this.puzzle.size - 1 && this.puzzle.horizontal[i][j]) {
                    topDiv.textContent = this.puzzle.horizontal[i][j] || ''
                    cell.appendChild(topDiv)
                }

                const rightDiv = document.createElement('div')
                rightDiv.className = 'edge-text right'
                if (j < this.puzzle.size - 1 && this.puzzle.vertical[i][j]) {
                    rightDiv.textContent = this.puzzle.vertical[i][j] || ''
                    cell.appendChild(rightDiv)
                }

                cell.onclick = () => {
                    if (this.puzzle.is_complete() && !this.puzzle.is_bad) {
                        return // So that you can't click when its complete
                    }
                    const cell_is_fixed = this.puzzle.is_fixed(i, j)
                    const previous_value = this.puzzle.get_value(i, j)
                    if (!cell_is_fixed) {
                        function next_value(current) {
                            if (current === EMOJI_ONE) return EMOJI_TWO
                            if (current === EMOJI_TWO) return null
                            return EMOJI_ONE
                        }
                        this.puzzle.set_value(next_value(this.puzzle.get_value(i, j)), i, j)
                        const content_div = cell.querySelector('.cell-content')
                        content_div.textContent = this.puzzle.get_value(i, j) || '' // TODO: Don't mess up the = and x
                    }
                    this.puzzle.is_complete()
                    this.puzzle.is_bad = !this.puzzle.validate_partial(i, j)
                    this.last_placement_timestamp = performance.now()
                    this.placement_history.push({ position: [i, j], previous_value: previous_value })
                }
                row.appendChild(cell)
            }
            this.table.appendChild(row)
        }
    }

    update_time() {
        this._set_button_active()
        this.recolor()
        const now = performance.now()
        if (!this.puzzle.is_complete() || this.puzzle.is_bad) {
            this.elapsed_ms += now - this.last_timestamp
        }
        this.last_timestamp = now
        const minutes = Math.floor((this.elapsed_ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((this.elapsed_ms % (1000 * 60)) / 1000);
        const fmt = (x) => x < 10 ? '0' + x : x;
        document.getElementById("time-display").textContent =
            `${fmt(minutes)}:${fmt(seconds)}${this.puzzle.is_complete() && !this.puzzle.is_bad ? " Congrats!" : ""}`;
    }

    recolor() {
        const is_bad = this.puzzle.validate_full()

        for (let i = 0; i < this.puzzle.size; i++) {
            const row = document.createElement('tr')
            for (let j = 0; j < this.puzzle.size; j++) {
                const cell = this.table.rows[i].cells[j]
                const cell_is_fixed = this.puzzle.is_fixed(i, j)
                let long_enough = performance.now() - this.last_placement_timestamp > 1000
                const cell_is_bad = !this.puzzle.validate_partial(i, j)
                cell.classList.value = ''
                if (cell_is_fixed) {
                    cell.classList.add('fixed')
                }
                if (long_enough && cell_is_bad) {
                    cell.classList.add('bad')
                }
            }
        }

        // Update table glow animation
        this.table.classList.value = ''
        if (this.puzzle.is_complete() && is_bad) {
            this.table.classList.add("glow")
        }
    }

    _set_button_active() {
        const puzzle_is_done = this.puzzle.is_complete() && !this.puzzle.bad();
        const undo_button = document.getElementById('undo-button');
        const clear_button = document.getElementById('clear-button');
        undo_button.disabled = puzzle_is_done || this.placement_history.length == 0;
        clear_button.disabled = puzzle_is_done
    }

    _set_cell(i, j, value) {
        const cell = this.table.rows[i].cells[j]
        const content_div = cell.querySelector('.cell-content')
        content_div.textContent = value || '';
        this.puzzle.set_value(value, i, j)
    }

    undo() {
        if (this.placement_history.length == 0) {
            return;
        }
        const { position: [i, j], previous_value: previous_value } = this.placement_history.pop()
        this._set_cell(i, j, previous_value)
        this.recolor()
    }

    clear() {
        this.puzzle.clear()
        for (let i = 0; i < this.puzzle.size; i++) {
            for (let j = 0; j < this.puzzle.size; j++) {
                if (!this.puzzle.fixed[i][j]) {
                    this._set_cell(i, j, null)
                }
            }
        }
        this.placement_history = []
        this.last_placement_timestamp = 0
        this.recolor()
    }

    record_move(i, j, previous_value) {
        this.last_place_timestamp_ms = performance.now()
        this.placement_history.push({ position: [i, j], previous_value: previous_value })
    }

    can_undo() {
        return this.placement_history.length > 0
    }
}

function make_2D_array(size, value) {
    return make_2D_array_dim(size, size, value)
}

function make_2D_array_dim(width, height, value) {
    return Array(height).fill().map(() => Array(width).fill(value))
}

function get_shuffled_positions(size) {
    const positions = []
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            positions.push([i, j])
        }
    }
    shuffle_array(positions)
    return positions
}

function shuffle_array(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]] // error here
    }
}

const game = new Game(new Puzzle(6))

window.onload = () => game.new_puzzle()