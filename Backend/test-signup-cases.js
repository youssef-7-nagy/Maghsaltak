const { registerSchema } = require("./validators/auth.validator");

const runTests = () => {
  const tests = [
    {
      name: "Empty fields",
      payload: {},
      expectError: true
    },
    {
      name: "Invalid email formats",
      payload: { name: "User", phone: "01234567890", email: "user@domain", password: "Password123!" },
      expectError: true
    },
    {
      name: "Non-Gmail addresses",
      payload: { name: "User", phone: "01234567890", email: "user@yahoo.com", password: "Password123!" },
      expectError: true
    },
    {
      name: "Phone numbers shorter or longer than 11 digits",
      payload: { name: "User", phone: "012345678", email: "user@gmail.com", password: "Password123!" },
      expectError: true
    },
    {
      name: "Phone numbers containing letters or symbols",
      payload: { name: "User", phone: "0123456789a", email: "user@gmail.com", password: "Password123!" },
      expectError: true
    },
    {
      name: "Weak passwords",
      payload: { name: "User", phone: "01234567890", email: "user@gmail.com", password: "weak" },
      expectError: true
    },
    {
      name: "Password mismatch (Simulated Frontend)",
      payload: { password: "Password123!", confirmPassword: "Password123" },
      expectError: true
    },
    {
      name: "Duplicate emails (Simulated Database)",
      payload: { email: "existing@gmail.com" },
      expectError: true
    },
    {
      name: "Valid registration flow",
      payload: { name: "User", phone: "01234567890", email: "newuser@gmail.com", password: "Password123!" },
      expectError: false
    }
  ];

  console.log("Running Validation Tests...\n");
  let passed = 0;

  tests.forEach(test => {
    let hasError = false;
    let messages = [];

    // Simulate Frontend Password Mismatch
    if (test.name.includes("Password mismatch")) {
      if (test.payload.password !== test.payload.confirmPassword) {
        hasError = true;
        messages.push("Passwords do not match");
      }
    } 
    // Simulate DB Duplicate Email
    else if (test.name.includes("Duplicate emails")) {
      const mockDB = ["existing@gmail.com"];
      if (mockDB.includes(test.payload.email)) {
        hasError = true;
        messages.push("Email already exists");
      }
    } 
    // Normal Joi Schema Test
    else {
      const { error } = registerSchema.validate(test.payload, { abortEarly: false });
      if (error) {
        hasError = true;
        messages = error.details.map(err => err.message);
      }
    }

    const testPassed = hasError === test.expectError;
    if (testPassed) {
      console.log(`✅ PASS: ${test.name}`);
      if (hasError) console.log(`   Caught errors: ${messages.join(" | ")}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Expected Error: ${test.expectError}, Got Error: ${hasError}`);
      if (messages.length > 0) console.log(`   Messages: ${messages.join(", ")}`);
    }
  });

  console.log(`\nTests Completed: ${passed}/${tests.length} passed.`);
};

runTests();
