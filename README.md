# Tic-Tac-Toe Game

Practice DOM manipulation and event listeners by building an interactive game.

---

## Task Description
Create a browser-based Tic-Tac-Toe game where two players take turns marking cells on a 3x3 grid. The game should track the current player, detect win conditions, and display the game status.

---

## HTML Structure Needed

- A 3x3 grid container with individual cells  
- A status display area showing current player or winner  
- A reset button to start a new game  

---

## JavaScript Functionality

### 1. Game Initialization
- Create the game board dynamically or select existing cells  
- Initialize game state (empty board, current player = 'X')  
- Add click event listeners to all cells  

### 2. Gameplay Logic
When a cell is clicked:

- Mark it with current player's symbol (**X** or **O**)  
- Prevent marking already filled cells  
- Check for win or draw after each move  
- Switch players if game continues  

### 3. Win Detection
- Check all possible winning combinations (rows, columns, diagonals)  
- Highlight winning cells when game is won  
- Display winner message  

### 4. Draw Detection
- Detect when all cells are filled with no winner  
- Display **"It's a draw!"** message  

### 5. Reset Functionality
- Clear all cells  
- Reset game state to beginning  
- Update status display  

---

## Challenges

- Add a score counter for **X** and **O** wins  
- Add animation effects when marking cells  