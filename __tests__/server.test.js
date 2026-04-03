'use strict';

/**
 * Comprehensive test suite for server.js — a minimal Node.js HTTP server
 * that serves a deterministic static response ("Hello, World!\n") with
 * status code 200 and Content-Type: text/plain for all requests.
 *
 * Test Categories:
 * 1. Request Handler - Unit Tests (mock req/res, no network I/O)
 * 2. HTTP Response - Integration Tests (supertest, real HTTP)
 * 3. HTTP Method Coverage (all HTTP verbs)
 * 4. URL Path Coverage (various URL paths)
 * 5. Edge Cases (concurrent requests, special chars, large payloads)
 * 6. Server Lifecycle (startup, shutdown, console output)
 * 7. Error Handling (EADDRINUSE, error events)
 *
 * Conventions:
 * - CommonJS require() syntax only (no ES module imports)
 * - AAA pattern (Arrange-Act-Assert) in every test
 * - Deterministic hardcoded expected values from server.js source
 * - Server instances created in tests are closed in teardown hooks
 * - Supertest tests use the server object directly (ephemeral port binding)
 */

const request = require('supertest');
const http = require('http');
const server = require('../server');

/* ================================================================
 * 1. REQUEST HANDLER — UNIT TESTS
 * ================================================================
 * Tests the request handler callback in complete isolation using
 * mock req/res objects. No network I/O, no server startup required.
 * The handler is extracted via server.listeners('request')[0].
 * ================================================================ */
describe('Request Handler - Unit Tests', () => {
  let handler;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Arrange: Extract the request handler callback from the server's
    // 'request' event listeners. http.createServer(cb) attaches cb
    // as a listener on the 'request' event via EventEmitter.
    handler = server.listeners('request')[0];

    // Arrange: Create minimal mock req/res objects matching the
    // http.IncomingMessage and http.ServerResponse interfaces used
    // by the handler.
    mockReq = {};
    mockRes = {
      statusCode: null,
      setHeader: jest.fn(),
      end: jest.fn(),
    };
  });

  it('should set status code to 200', () => {
    // Act: Invoke the handler with mock objects
    handler(mockReq, mockRes);

    // Assert: Status code must be exactly 200
    expect(mockRes.statusCode).toBe(200);
  });

  it('should set Content-Type header to text/plain', () => {
    // Act
    handler(mockReq, mockRes);

    // Assert: setHeader must be called with exact arguments
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
  });

  it('should send "Hello, World!\\n" as response body', () => {
    // Act
    handler(mockReq, mockRes);

    // Assert: end() must receive the exact response string
    expect(mockRes.end).toHaveBeenCalledWith('Hello, World!\n');
  });

  it('should call setHeader exactly once', () => {
    // Act
    handler(mockReq, mockRes);

    // Assert: Only one header is set by the handler
    expect(mockRes.setHeader).toHaveBeenCalledTimes(1);
  });

  it('should call end exactly once', () => {
    // Act
    handler(mockReq, mockRes);

    // Assert: Response is ended exactly once
    expect(mockRes.end).toHaveBeenCalledTimes(1);
  });
});

/* ================================================================
 * 2. HTTP RESPONSE — INTEGRATION TESTS
 * ================================================================
 * Makes real HTTP requests against the server using supertest and
 * asserts actual HTTP response properties (status, headers, body).
 * Supertest uses the already-listening server on port 3000.
 * ================================================================ */
describe('HTTP Response - Integration Tests', () => {
  it('should return 200 status code for GET /', async () => {
    // Act: Send a real HTTP GET request
    const res = await request(server).get('/');

    // Assert: HTTP status code is 200 OK
    expect(res.statusCode).toBe(200);
  });

  it('should return Content-Type text/plain header', async () => {
    // Act
    const res = await request(server).get('/');

    // Assert: Content-Type header matches exactly
    expect(res.headers['content-type']).toBe('text/plain');
  });

  it('should return "Hello, World!\\n" as response body', async () => {
    // Act
    const res = await request(server).get('/');

    // Assert: Response body is the exact expected string
    expect(res.text).toBe('Hello, World!\n');
  });

  it('should include Date header in response', async () => {
    // Act
    const res = await request(server).get('/');

    // Assert: Node.js HTTP server automatically adds Date header
    expect(res.headers).toHaveProperty('date');
  });

  it('should include Connection header in response', async () => {
    // Act
    const res = await request(server).get('/');

    // Assert: Connection header is present in response
    expect(res.headers).toHaveProperty('connection');
  });
});

/* ================================================================
 * 3. HTTP METHOD COVERAGE
 * ================================================================
 * Verifies the server responds identically (200, text/plain,
 * Hello World) regardless of HTTP method. The handler does not
 * differentiate between methods.
 * ================================================================ */
describe('HTTP Method Coverage', () => {
  // Parameterized test for standard HTTP methods that return bodies
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options'];

  test.each(methods)('should return 200 for %s request', async (method) => {
    // Act: Send request using the specified HTTP method
    const res = await request(server)[method]('/');

    // Assert: Status code is always 200 regardless of method
    expect(res.statusCode).toBe(200);
  });

  it('should return correct body for POST request', async () => {
    // Act
    const res = await request(server).post('/');

    // Assert: POST returns the same body as GET
    expect(res.text).toBe('Hello, World!\n');
  });

  it('should return correct Content-Type for PUT request', async () => {
    // Act
    const res = await request(server).put('/');

    // Assert: Content-Type is consistent across methods
    expect(res.headers['content-type']).toBe('text/plain');
  });

  it('should return 200 for HEAD request', async () => {
    // Act: HEAD is a special case — server returns headers but no body
    const res = await request(server).head('/');

    // Assert: Status code is 200 even for HEAD
    expect(res.statusCode).toBe(200);

    // Assert: HEAD responses must not include a body per HTTP spec;
    // Node.js strips the body automatically for HEAD requests
    expect(res.text).toBeFalsy();
  });
});

/* ================================================================
 * 4. URL PATH COVERAGE
 * ================================================================
 * Verifies the server responds identically regardless of URL path.
 * The handler ignores req.url entirely.
 * ================================================================ */
describe('URL Path Coverage', () => {
  const paths = [
    '/',
    '/foo',
    '/bar/baz',
    '/a/b/c/d/e',
    '/path?query=value',
    '/path%20with%20spaces',
  ];

  test.each(paths)('should return 200 for path: %s', async (path) => {
    // Act: Send GET request to each path
    const res = await request(server).get(path);

    // Assert: Status code and body are identical for every path
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });
});

/* ================================================================
 * 5. EDGE CASES
 * ================================================================
 * Covers boundary conditions and unusual scenarios including
 * concurrent requests, special characters, and large payloads.
 * ================================================================ */
describe('Edge Cases', () => {
  it('should handle concurrent requests correctly', async () => {
    // Arrange: Create a dedicated test server using the same handler
    // to avoid connection interference from the main server's state.
    // Binding to port 0 lets the OS assign an available ephemeral port.
    const handler = server.listeners('request')[0];
    const testServer = http.createServer(handler);

    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', resolve);
    });

    // Arrange: Create 10 simultaneous requests against the test server
    const requests = Array.from({ length: 10 }, () =>
      request(testServer).get('/')
    );

    // Act: Execute all requests in parallel
    const responses = await Promise.all(requests);

    // Assert: Every response is correct
    responses.forEach((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('Hello, World!\n');
    });

    // Cleanup: Close the dedicated test server
    await new Promise((resolve) => {
      testServer.close(resolve);
    });
  });

  it('should handle empty path', async () => {
    // Act: Empty string path defaults to '/' in HTTP
    const res = await request(server).get('');

    // Assert
    expect(res.statusCode).toBe(200);
  });

  it('should handle deeply nested URL paths', async () => {
    // Act: Ten levels of nesting
    const res = await request(server).get('/a/b/c/d/e/f/g/h/i/j');

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  it('should handle URLs with special characters', async () => {
    // Act: URL-encoded spaces
    const res = await request(server).get('/path%20with%20spaces');

    // Assert
    expect(res.statusCode).toBe(200);
  });

  it('should handle URLs with query strings', async () => {
    // Act: Multiple query parameters
    const res = await request(server).get('/search?q=hello&lang=en');

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  it('should handle large request payloads', async () => {
    // Arrange: Create a 10,000-character payload
    const largePayload = 'x'.repeat(10000);

    // Act: Server ignores the request body entirely
    const res = await request(server).post('/').send(largePayload);

    // Assert: Standard response regardless of payload size
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello, World!\n');
  });

  it('should return response body with exact trailing newline', async () => {
    // Act
    const res = await request(server).get('/');

    // Assert: Verify exact body content including trailing newline
    expect(res.text).toMatch(/Hello, World!\n$/);

    // Assert: "Hello, World!\n" is exactly 14 characters
    expect(res.text.length).toBe(14);
  });
});

/* ================================================================
 * 6. SERVER LIFECYCLE
 * ================================================================
 * Tests server startup behavior, console output verification,
 * graceful shutdown, and type verification.
 *
 * NOTE: The startup message test closes the main server and
 * re-requires a fresh instance. It is placed last to avoid
 * affecting supertest tests in earlier describe blocks.
 * ================================================================ */
describe('Server Lifecycle', () => {
  it('should be an instance of http.Server', () => {
    // Assert: The exported object is a proper HTTP server instance
    expect(server).toBeInstanceOf(http.Server);
  });

  it('should gracefully close the server', (done) => {
    // Arrange: Create a dedicated test server on ephemeral port (0)
    // to avoid port conflicts with the main server on port 3000
    const testServer = http.createServer((req, res) => {
      res.statusCode = 200;
      res.end('test');
    });

    testServer.listen(0, '127.0.0.1', () => {
      // Act: Close the test server
      testServer.close((err) => {
        // Assert: Close completes without error
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  it('should emit listening event when started', (done) => {
    // Arrange: Create a test server on ephemeral port
    const testServer = http.createServer((req, res) => {
      res.end('test');
    });

    testServer.on('listening', () => {
      // Assert: Server reports listening state as true
      expect(testServer.listening).toBe(true);

      // Cleanup: Close the test server
      testServer.close(done);
    });

    // Act: Start the server — triggers the 'listening' event
    testServer.listen(0, '127.0.0.1');
  });

  it('should log the correct startup message', (done) => {
    // Arrange: Spy on console.log BEFORE re-requiring the module
    // so we can capture the log call from the listen callback
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Close the main server to free port 3000 for the fresh require.
    // server.js hardcodes port 3000, so it must be available.
    server.close(() => {
      // Reset the module cache so require() loads a fresh copy of server.js
      jest.resetModules();

      // Act: Re-require triggers server.listen(3000, ...) and
      // its callback calls console.log with the startup message
      const freshServer = require('../server');

      // The listen callback fires asynchronously after TCP binding completes.
      // Use setTimeout to allow the event loop to process the callback.
      setTimeout(() => {
        // Assert: Verify the exact startup message was logged
        expect(logSpy).toHaveBeenCalledWith(
          'Server running at http://127.0.0.1:3000/'
        );

        // Cleanup: Close the fresh server and restore console.log
        freshServer.close(() => {
          logSpy.mockRestore();
          done();
        });
      }, 200);
    });
  });
});

/* ================================================================
 * 7. ERROR HANDLING
 * ================================================================
 * Tests server behavior under error conditions including port
 * conflicts (EADDRINUSE) and error event propagation.
 * Uses ephemeral ports (0) to avoid interfering with other tests.
 * ================================================================ */
describe('Error Handling', () => {
  it('should handle EADDRINUSE error', (done) => {
    // Arrange: Create a blocking server on an ephemeral port
    const blockingServer = http.createServer();

    blockingServer.listen(0, '127.0.0.1', () => {
      // Get the actual port assigned by the OS
      const occupiedPort = blockingServer.address().port;

      // Act: Attempt to bind a second server to the same port
      const conflictServer = http.createServer();

      conflictServer.on('error', (err) => {
        // Assert: The error code must be EADDRINUSE
        expect(err.code).toBe('EADDRINUSE');

        // Cleanup: Close the blocking server
        blockingServer.close(done);
      });

      conflictServer.listen(occupiedPort, '127.0.0.1');
    });
  });

  it('should handle server error events', () => {
    // Arrange: Create a test server and attach a mock error handler
    const testServer = http.createServer();
    const errorHandler = jest.fn();
    testServer.on('error', errorHandler);

    // Act: Emit a synthetic error event on the server
    testServer.emit('error', new Error('test error'));

    // Assert: The error handler was invoked exactly once with an Error
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});

/* ================================================================
 * GLOBAL CLEANUP
 * ================================================================
 * Ensure the main server is closed after all tests complete to
 * release port 3000 and prevent resource leaks. Checks the
 * listening state first because the Server Lifecycle tests may
 * have already closed the server.
 * ================================================================ */
afterAll((done) => {
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});
