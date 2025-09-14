export interface Lesson {
  id: number
  title: string
  difficulty: "Beginner" | "Easy" | "Medium" | "Hard" | "Expert"
  category: string
  description: string
  interviewQuestion: string
  tasks: string[]
  expectedOutput: string[]
  learningObjectives: string[]
  hints: string[]
  whyItMatters: {
    description: string
    points: string[]
  }
  problem: string
  starterCode: string
  solution: string
  testCases: Array<{
    input: string
    expectedOutput: string
  }>
}

export const lessons: Lesson[] = [
  {
    id: 1,
    title: "Print Statements",
    difficulty: "Beginner",
    category: "Python Basics",
    description: "Learn the basics of Python output",
    interviewQuestion: "Write a Python program that displays 'Hello, World!' to the console.",
    tasks: [
      "Write a Python program that prints 'Hello, World!' to the console",
      "Make sure the output matches exactly",
    ],
    expectedOutput: ["Hello, World!"],
    learningObjectives: [
      "Understand the print() function",
      "Learn basic Python syntax",
      "Execute your first Python program",
    ],
    hints: ["Use the print() function to output text", "Remember to put the text in quotes"],
    whyItMatters: {
      description: "The print() function is fundamental to Python programming and debugging.",
      points: [
        "Essential for displaying output to users",
        "Critical for debugging and testing code",
        "Foundation for more complex output operations",
      ],
    },
    problem: "Write a Python program that prints 'Hello, World!' to the console.",
    starterCode: "# Write your solution here\n",
    solution: "print('Hello, World!')",
    testCases: [
      {
        input: "",
        expectedOutput: "Hello, World!",
      },
    ],
  },
  {
    id: 2,
    title: "Interactive Programming: Variables and User Input",
    difficulty: "Beginner",
    category: "Python Basics",
    description: "Working with variables and user input",
    interviewQuestion: "Write a program that asks for the user's name and displays a personalized greeting.",
    tasks: [
      "Create a program that asks for the user's name",
      "Store the input in a variable",
      "Display a personalized greeting",
    ],
    expectedOutput: ["What's your name? Alice", "Hello, Alice! Nice to meet you."],
    learningObjectives: [
      "Learn to use the input() function",
      "Understand variable assignment",
      "Practice string formatting",
    ],
    hints: ["Use input() to get user input", "Use f-strings or string concatenation to combine text with variables"],
    whyItMatters: {
      description: "User interaction is essential for creating dynamic, responsive programs.",
      points: [
        "Foundation for interactive applications",
        "Essential for data collection",
        "Key skill for user experience design",
      ],
    },
    problem: "Create a program that asks for the user's name and greets them personally.",
    starterCode: "# Write your solution here\n",
    solution: 'name = input("What\'s your name? ")\nprint(f"Hello, {name}! Nice to meet you.")',
    testCases: [
      {
        input: "Alice",
        expectedOutput: "Hello, Alice! Nice to meet you.",
      },
    ],
  },
  {
    id: 3,
    title: "Function Design: Mathematical Operations",
    difficulty: "Easy",
    category: "Functions",
    description: "Perform calculations with Python",
    interviewQuestion:
      "Write a function that takes two numbers and returns their sum, difference, product, and quotient.",
    tasks: [
      "Write a function that takes two numbers as parameters",
      "Return the sum, difference, product, and quotient",
      "Test your function with sample values",
    ],
    expectedOutput: ["(15, 5, 50, 2.0)"],
    learningObjectives: [
      "Learn function definition syntax",
      "Understand return statements",
      "Practice basic arithmetic operations",
    ],
    hints: ["Return multiple values as a tuple", "Use +, -, *, / for basic operations"],
    whyItMatters: {
      description: "Functions are the building blocks of modular, reusable code.",
      points: ["Essential for code organization", "Enables code reusability", "Foundation for complex algorithms"],
    },
    problem: "Write a function that takes two numbers and returns their sum, difference, product, and quotient.",
    starterCode: "# Write your solution here\n",
    solution: "def calculate(a, b):\n    return a + b, a - b, a * b, a / b\n\nresult = calculate(10, 5)\nprint(result)",
    testCases: [
      {
        input: "calculate(10, 5)",
        expectedOutput: "(15, 5, 50, 2.0)",
      },
    ],
  },
  {
    id: 4,
    title: "Decision Making: If-Else Statements",
    difficulty: "Easy",
    category: "Control Flow",
    description: "Making decisions with if statements",
    interviewQuestion: "Write a function that determines if a number is positive, negative, or zero.",
    tasks: [
      "Write a function that takes a number as input",
      "Determine if the number is positive, negative, or zero",
      "Return the appropriate classification",
    ],
    expectedOutput: ["positive", "negative", "zero"],
    learningObjectives: [
      "Master if, elif, and else statements",
      "Understand comparison operators",
      "Learn decision-making logic",
    ],
    hints: ["Use if, elif, and else statements", "Compare the number with 0"],
    whyItMatters: {
      description: "Conditional logic is fundamental to creating intelligent, responsive programs.",
      points: [
        "Essential for program flow control",
        "Enables dynamic behavior",
        "Foundation for complex decision trees",
      ],
    },
    problem: "Write a function that determines if a number is positive, negative, or zero.",
    starterCode: "# Write your solution here\n",
    solution:
      "def check_number(num):\n    if num > 0:\n        return 'positive'\n    elif num < 0:\n        return 'negative'\n    else:\n        return 'zero'\n\nprint(check_number(5))\nprint(check_number(-3))\nprint(check_number(0))",
    testCases: [
      {
        input: "check_number(5)",
        expectedOutput: "positive",
      },
      {
        input: "check_number(-3)",
        expectedOutput: "negative",
      },
      {
        input: "check_number(0)",
        expectedOutput: "zero",
      },
    ],
  },
  {
    id: 5,
    title: "Data Processing: List Iteration and Algorithms",
    difficulty: "Medium",
    category: "Data Structures",
    description: "Working with collections and iteration",
    interviewQuestion:
      "Write a function that finds the maximum number in a list without using the built-in max() function.",
    tasks: [
      "Write a function that accepts a list of numbers",
      "Find the maximum number without using max()",
      "Handle edge cases like empty lists",
    ],
    expectedOutput: ["9"],
    learningObjectives: ["Master for loops and iteration", "Understand list operations", "Learn algorithm thinking"],
    hints: [
      "Start with the first element as the maximum",
      "Loop through the list and compare each element",
      "Handle empty lists",
    ],
    whyItMatters: {
      description: "Lists and loops are fundamental to data processing and algorithm implementation.",
      points: [
        "Essential for data manipulation",
        "Foundation for algorithm development",
        "Critical for processing collections",
      ],
    },
    problem: "Write a function that finds the maximum number in a list without using the built-in max() function.",
    starterCode: "# Write your solution here\n",
    solution:
      "def find_maximum(numbers):\n    if not numbers:\n        return None\n    \n    max_num = numbers[0]\n    for num in numbers:\n        if num > max_num:\n            max_num = num\n    return max_num\n\ntest_list = [3, 7, 2, 9, 1, 5]\nprint(find_maximum(test_list))",
    testCases: [
      {
        input: "find_maximum([3, 7, 2, 9, 1, 5])",
        expectedOutput: "9",
      },
    ],
  },
]
