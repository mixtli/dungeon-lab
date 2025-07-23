# AI Behavior Guidelines for Claude Code

This document defines how Claude Code should behave when working with the Dungeon Lab VTT project.

## Core Behavioral Principles

### Task Management Approach
- **Use TodoWrite tool** for tracking multi-step tasks and complex features
- **Create implementation plans** in the `docs/` directory for large features
- **Work through plans systematically**, marking tasks complete as you go
- **Break down complex tasks** into manageable sub-items

### Workflow Patterns

#### For Large Features
1. Create detailed implementation plan document in `docs/` directory
2. Use TodoWrite to track major milestones and tasks
3. Reference the plan document throughout implementation
4. Update the plan as requirements change

#### For Regular Development
1. Use TodoWrite for any task with more than 3 steps
2. Mark tasks as in_progress before starting work
3. Mark tasks as completed immediately after finishing
4. Only have one task in_progress at a time

### Documentation-First Approach
- **Always check existing documentation** before starting any task
- Review relevant files in `docs/` directory for context
- Check `CLAUDE.md` and related files for established patterns
- If documentation conflicts with requests, ask for clarification

### Memory and Knowledge Management

#### Use Memento MCP for Persistent Knowledge
- **Architectural decisions** and patterns that should persist between sessions
- **Important project context** that affects multiple features
- **Domain knowledge** about VTT/TTRPG concepts learned during development
- **Complex implementation details** that might be needed again

#### What to Store in Memento
- Plugin architecture patterns and boundaries
- Authentication and security patterns
- Performance optimization techniques discovered
- Complex business logic related to TTRPG mechanics
- Integration patterns between packages

#### What NOT to Store in Memento
- Temporary implementation details
- Basic coding patterns already documented
- Simple bug fixes
- Routine maintenance tasks

### Problem-Solving Approach

#### For Complex Problems
1. **Use sequential thinking** to break down multi-step problems
2. **Research existing codebase** to understand current patterns
3. **Check documentation** for established approaches
4. **Consider plugin boundaries** and architectural constraints

#### For Research Tasks
- Use available MCP tools for up-to-date information
- Document findings that might be useful for future development
- Store important architectural insights in Memento

### Communication Style
- **Be concise and direct** - avoid unnecessary preamble
- **Focus on the task at hand** without tangential information
- **Answer questions directly** without elaboration unless requested
- **Keep responses short** (under 4 lines unless detail requested)

### Tool Usage Requirements

#### Required Tool Usage
- **TodoWrite**: For any multi-step task or complex feature
- **Memento MCP**: For storing persistent architectural knowledge
- **Sequential Thinking**: For complex problem-solving and research

#### Available Development Tools
- **Playwright MCP**: For web testing and browser automation
- **MongoDB MCP**: For database examination and queries
- **Git tools**: For version control operations
- **IDE integration**: For code diagnostics and execution

#### Debugging and Troubleshooting
- Check browser and server console output when debugging
- Use targeted logging for complex issues
- Fix root causes rather than symptoms
- Document complex fixes for future reference

### Quality Standards
- **Verify implementation** before marking tasks complete
- **Run linting and type checking** for code changes
- **Test functionality** according to test strategies
- **Update documentation** when making architectural changes

### Error Handling
- When encountering errors, investigate the root cause
- Check existing patterns and documentation for solutions
- If stuck, ask for clarification rather than guessing
- Document solutions to complex problems

## Integration with Development Workflow

### Before Starting Work
1. Check relevant documentation
2. Review existing patterns in codebase
3. Create TodoWrite list for multi-step tasks
4. Set up implementation plan for large features

### During Development
1. Follow established patterns and conventions
2. Mark TodoWrite tasks as in_progress/completed
3. Store important insights in Memento
4. Use appropriate MCP tools for testing and debugging

### After Completing Work
1. Verify implementation works correctly
2. Update TodoWrite tasks to completed
3. Store architectural insights in Memento
4. Update documentation if needed

This behavioral framework ensures consistent, efficient development while maintaining the high quality standards of the Dungeon Lab project.