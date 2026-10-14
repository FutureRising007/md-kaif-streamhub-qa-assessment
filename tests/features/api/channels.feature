@api @channels
Feature: Channels API
  GET /api/channels (filter by country / verified, sort, paginate) and GET /api/channels/:id.
  The mock data has 6 channels.

  @smoke
  Scenario: List channels with defaults
    When I send a GET request to "/api/channels"
    Then the response status should be 200
    And the response should be JSON
    And the response body should match the "channel list" schema
    And the total should be 6 with 1 page
    And the items should be sorted by "name" in ascending order

  Scenario Outline: Filter channels by country - <country>
    When I send a GET request to "/api/channels?country=<country>"
    Then the response status should be 200
    And every item should have "country" equal to "<country>"
    And the response should contain <count> items

    Examples:
      | country | count |
      | IN      | 2     |
      | US      | 2     |
      | GB      | 1     |

  Scenario Outline: Filter channels by verified=<verified>
    When I send a GET request to "/api/channels?verified=<verified>"
    Then the response status should be 200
    And every item should have "verified" equal to "<verified>"
    And the response should contain <count> items

    Examples:
      | verified | count |
      | true     | 4     |
      | false    | 2     |

  Scenario: Country with no channels returns an empty list
    When I send a GET request to "/api/channels?country=FR"
    Then the response status should be 200
    And the response should contain 0 items

  Scenario Outline: Sort channels by <sortBy> <order>
    When I send a GET request to "/api/channels?sortBy=<sortBy>&order=<order>"
    Then the response status should be 200
    And the items should be sorted by "<sortBy>" in <direction> order

    Examples:
      | sortBy      | order | direction  |
      | name        | asc   | ascending  |
      | name        | desc  | descending |
      | subscribers | asc   | ascending  |
      | subscribers | desc  | descending |

  Scenario: Filter and sort together
    When I send a GET request to "/api/channels?verified=true&sortBy=subscribers&order=desc"
    Then the response status should be 200
    And the item ids should be "2, 4, 6, 1"

  Scenario: Paginate channels
    When I send a GET request to "/api/channels?page=2&limit=4"
    Then the response status should be 200
    And the response should contain 2 items
    And the total should be 6 with 2 pages
    And the items should be items 5 to 6 of "/api/channels"

  @smoke
  Scenario: Get an existing channel
    When I send a GET request to "/api/channels/2"
    Then the response status should be 200
    And the response body should match the "channel" schema
    And the returned item should have id 2

  @negative
  Scenario: Unknown channel id returns 404
    When I send a GET request to "/api/channels/99"
    Then the response status should be 404
    And the response body should match the "error" schema
    And the error code should be "NOT_FOUND"

  @negative
  Scenario Outline: Invalid channels request is rejected - <case>
    When I send a GET request to "<path>"
    Then the response status should be 400
    And the response body should match the "error" schema
    And the error code should be "VALIDATION_ERROR"
    And the error should mention the "<param>" parameter

    Examples:
      | case                  | path                              | param    |
      | country lowercase     | /api/channels?country=in          | country  |
      | country 3 letters     | /api/channels?country=IND         | country  |
      | verified not boolean  | /api/channels?verified=yes        | verified |
      | unsupported sort      | /api/channels?sortBy=views        | sortBy   |
      | limit above max       | /api/channels?limit=100           | limit    |
      | unknown parameter     | /api/channels?genre=music         | genre    |
      | id not a number       | /api/channels/abc                 | id       |
