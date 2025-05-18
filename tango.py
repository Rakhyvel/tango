import copy
import random


BOARD_SIZE = 6


def main():
    print("Hello, Kyra!")
    cool_board = generate_unique_solution_puzzle()
    print('Solve it:')
    print_board(cool_board)
    

def generate_unique_solution_puzzle():
    while True:
        board = generate_random_board()
        if is_board_correct(board):
            break

    print('Found a board:')
    print_board(board)
    print('')

    # All positions to try removing from
    positions = [(i, j) for i in range(BOARD_SIZE) for j in range(BOARD_SIZE)]
    random.shuffle(positions)

    puzzle = copy.deepcopy(board)
    for (i, j) in positions:
        original = puzzle[i][j]
        puzzle[i][j] = None # Tentatively remove the piece

        # Count how many ways we can fill in the None values
        solutions = count_solutions(copy.deepcopy(puzzle))

        if solutions != 1:
            puzzle[i][j] = original # Restore it if ambiguous
    
    return puzzle


def count_solutions(partial_board, row=0, col=0):
    # If we've reached the end of the board, check if it's a valid solution.
    if row == BOARD_SIZE:
        if is_board_correct(partial_board):
            return 1 # One valid way to fill the board
        return 0
    
    # Move to the next cell (left to right, top to bottom)
    next_row, next_col = (row, col + 1) if col < BOARD_SIZE - 1 else (row + 1, 0)

    # If this cell is already filled, move on
    if partial_board[row][col] is not None:
        return count_solutions(partial_board, next_row, next_col)
    
    count = 0 # This will count how many valid completions we find

    # Try both possible pieces in the empty cell
    for piece in ['🍞', '💖']:
        partial_board[row][col] = piece # Tentatively place a piece

        # If board is still valid so far, continue searching
        if is_board_correct(partial_board):
            count += count_solutions(partial_board, next_row, next_col)
        
        partial_board[row][col] = None # Backtrack: undow the piece
    return count # Total number of valid ways to finish the board


def generate_random_board():
    board = []
    for i in range(BOARD_SIZE):
        row = []
        for j in range(BOARD_SIZE):
            r = random.random()
            if r < 0.5:
                row.append('🍞')
            else:
                row.append('💖')
        board.append(row)
    return board


def is_board_correct(b):
    def list_has_3(list):
        return list.count('🍞') <= 3 and list.count('💖') <= 3
    
    def no_3_in_row(list):
        counter = 0
        last_seen = None
        for e in list:
            if e is None:
                counter = 0
                last_seen = None
                continue
            if e != last_seen:
                last_seen = e
                counter = 1
            else:
                counter += 1
                if counter > 2:
                    return False # Found 3 in a row
        return True
    
    for row in b:
        if not list_has_3(row):
            return False
        if not no_3_in_row(row):
            return False

    for i in range(BOARD_SIZE):
        col = [row[i] for row in b]
        if not list_has_3(col):
            return False
        if not no_3_in_row(col):
            return False

    return True


def print_board(board):
    for i in range(BOARD_SIZE):
        print('|----+----+----+----+----+----|')
        print('|', end='')
        for j in range(BOARD_SIZE):
            piece = board[i][j]
            if piece:
                print(f' {board[i][j]} |', end='')
            else:
                print(f'    |', end='')
        print('')


if __name__ == "__main__":
    main()
