export function setup() {
  process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32chars!!';
}
