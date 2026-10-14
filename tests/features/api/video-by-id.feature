@api @videos
Feature: Videos API - get by id

  @smoke
  Scenario: Get an existing video
    When I send a GET request to "/api/videos/3"
    Then the response status should be 200
    And the response should be JSON
    And the response body should match the "video" schema
    And the returned item should have id 3

  @negative
  Scenario: Unknown video id returns 404
    When I send a GET request to "/api/videos/999"
    Then the response status should be 404
    And the response body should match the "error" schema
    And the error code should be "NOT_FOUND"

  @negative
  Scenario Outline: Invalid video id is rejected - <id>
    When I send a GET request to "/api/videos/<id>"
    Then the response status should be 400
    And the response body should match the "error" schema
    And the error code should be "VALIDATION_ERROR"
    And the error should mention the "id" parameter

    Examples:
      | id  |
      | abc |
      | 0   |
      | -1  |
      | 1.5 |
