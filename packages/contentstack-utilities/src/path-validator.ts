class PathValidator {
  validatePath(userInput) {
    if (!/^[^.]+$/.test(userInput)) {
      throw 'The path contains illegal character such as `.`. Please use absolute paths.';
    }
    return true;
  }
}

export default new PathValidator();