# 1.3.1

- `on${event}` properties correctly update handler
  - Sets property to `null` when assigned something that isn't a function
  - Removes old listener if assigned something that isn't a function
- Refactored/added more unit tests
- `istanbul` test coverage

# 1.3.0

- Added `withCredentials` instance property to more closely match XHR API.
- Fixed bug with one-shot event listeners
- Added more unit tests for `EventTarget` API and instance properties.

# 1.2.1

- Fixed browser files not being included in package.

# 1.2.0

- Added support for browser environments.

# 1.1.0

- Added support for `node.js >= 0.10.x`.

# 1.0.0

- Added initial implementation.

