---
name: code-review
description: Automated PR review checklist covering security, performance, architecture, and code quality. Use when reviewing pull requests, examining code changes, or performing code quality assessments.
---

# Code Review Skill

## Quick Reference

For comprehensive review guidelines, see:
- **[Code Review Checklist](./references/code-review-checklist.md)** - Complete PR review guidelines with severity levels and checklists

## Review Process

### Severity Levels
- 🔴 **Critical**: Must fix before merge (security, correctness, breaking changes)
- 🟡 **Important**: Should fix (performance, maintainability, best practices)
- 🟢 **Suggestion**: Consider improving (style, optimization, readability)

### Quick Review Categories

1. **Security** - No hardcoded secrets, input validation, secure error handling
2. **Correctness** - Logic validation, error scenarios, data integrity
3. **Architecture** - Code organization, design patterns, modularity
4. **Performance** - Efficiency, resource management, concurrency
5. **Testing** - Test coverage, quality tests, TDD compliance
6. **Conventions** - TypeScript standards, code style, documentation
7. **Monorepo** - Cross-package imports, workspace dependencies, manifest validity

## Quick Checklist Template

```markdown
## Security Review
- [ ] No hardcoded secrets or tokens
- [ ] Input validation present
- [ ] Error handling secure (no sensitive data in logs)

## Correctness Review  
- [ ] Logic correctly implemented
- [ ] Edge cases handled
- [ ] Error scenarios covered
- [ ] Async/await chains correct

## Architecture Review
- [ ] Proper code organization
- [ ] Design patterns followed
- [ ] Good modularity
- [ ] No circular dependencies

## Performance Review
- [ ] Efficient implementation
- [ ] No unnecessary API calls
- [ ] Memory leaks avoided
- [ ] Concurrency handled correctly

## Testing Review
- [ ] Adequate test coverage (80%+)
- [ ] Quality tests (not just passing)
- [ ] TDD compliance
- [ ] Both success and failure paths tested

## Code Conventions
- [ ] TypeScript strict mode
- [ ] Consistent naming conventions
- [ ] No unused imports or variables
- [ ] Documentation adequate

## Monorepo Checks
- [ ] Cross-package imports use published names
- [ ] Workspace dependencies declared correctly
- [ ] OCLIF manifest updated if commands changed
- [ ] No breaking changes to exported APIs
```

## Usage

Use the comprehensive checklist guide for detailed review guidelines, common issues, severity assessment, and best practices for code quality in the Contentstack CLI monorepo.
