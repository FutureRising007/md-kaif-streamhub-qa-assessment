@api
Feature: General API behaviour

  @smoke
  Scenario: Health check
    When I send a GET request to "/health"
    Then the response status should be 200
    And the response should be JSON

  @negative
  Scenario Outline: Unknown route returns a JSON 404 - <path>
    When I send a GET request to "<path>"
    Then the response status should be 404
    And the response should be JSON
    And the response body should match the "error" schema
    And the error code should be "NOT_FOUND"

    Examples:
      | path           |
      | /api/movies    |
      | /api/videos/3/comments |
      | /              |
