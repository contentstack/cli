export function shouldNotBeEmpty(input) {
  if (input.length === 0)
    throw new Error('Please enter a valid value')
  return true
}