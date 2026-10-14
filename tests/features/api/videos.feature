@api @videos
Feature: Videos API - list endpoint
  GET /api/videos supports filtering, search, sorting and pagination.
  The mock data has 20 videos across 6 genres and 6 channels.

  @smoke
  Scenario: List videos with default pagination
    When I send a GET request to "/api/videos"
    Then the response status should be 200
    And the response should be JSON
    And the response body should match the "video list" schema
    And the pagination should be page 1 with limit 10
    And the total should be 20 with 2 pages
    And the items should be sorted by "publishedAt" in descending order

  Scenario Outline: Filter videos by genre - <genre>
    When I send a GET request to "/api/videos?genre=<genre>"
    Then the response status should be 200
    And the response body should match the "video list" schema
    And every item should have "genre" equal to "<genre>"

    Examples:
      | genre     |
      | music     |
      | gaming    |
      | education |
      | sports    |
      | tech      |
      | comedy    |

  Scenario: Filter videos by channel
    When I send a GET request to "/api/videos?channelId=1"
    Then the response status should be 200
    And every item should have "channelId" equal to "1"
    And the total should be 4 with 1 page

  Scenario: Filter videos by minimum rating
    When I send a GET request to "/api/videos?minRating=4.6&limit=50"
    Then the response status should be 200
    And every item should have "rating" of at least 4.6

  @boundary
  Scenario: Minimum rating is inclusive
    # two videos are rated exactly 4.9 - both must come back
    When I send a GET request to "/api/videos?minRating=4.9&sortBy=title&order=asc"
    Then the response status should be 200
    And the item ids should be "13, 3"

  Scenario: Search is case insensitive
    When I send a GET request to "/api/videos?q=LIVE"
    Then the response status should be 200
    And every item "title" should contain "live" ignoring case
    And the response should contain 2 items

  Scenario: Search with no matches returns an empty list, not an error
    When I send a GET request to "/api/videos?q=nothing-matches-this"
    Then the response status should be 200
    And the response should contain 0 items
    And the total should be 0 with 0 pages

  Scenario Outline: Sort videos by <sortBy> <order>
    When I send a GET request to "/api/videos?sortBy=<sortBy>&order=<order>&limit=50"
    Then the response status should be 200
    And the items should be sorted by "<sortBy>" in <direction> order

    Examples:
      | sortBy      | order | direction  |
      | title       | asc   | ascending  |
      | title       | desc  | descending |
      | views       | asc   | ascending  |
      | views       | desc  | descending |
      | rating      | asc   | ascending  |
      | rating      | desc  | descending |
      | publishedAt | asc   | ascending  |
      | publishedAt | desc  | descending |

  Scenario: Combine filters, sorting and search
    When I send a GET request to "/api/videos?genre=music&minRating=4.5&sortBy=views&order=desc"
    Then the response status should be 200
    And the item ids should be "7, 1, 13"

  Scenario: Second page returns the next slice of results
    When I send a GET request to "/api/videos?page=2&limit=5"
    Then the response status should be 200
    And the pagination should be page 2 with limit 5
    And the total should be 20 with 4 pages
    And the items should be items 6 to 10 of "/api/videos?limit=50"

  Scenario: Page past the end returns an empty list
    When I send a GET request to "/api/videos?page=5&limit=5"
    Then the response status should be 200
    And the response should contain 0 items
    And the total should be 20 with 4 pages

  @boundary
  Scenario Outline: Limit boundaries are accepted - limit=<limit>
    When I send a GET request to "/api/videos?limit=<limit>"
    Then the response status should be 200
    And the response should contain <count> items

    Examples:
      | limit | count |
      | 1     | 1     |
      | 50    | 20    |

  @negative
  Scenario Outline: Invalid query parameter is rejected - <case>
    When I send a GET request to "/api/videos?<query>"
    Then the response status should be 400
    And the response should be JSON
    And the response body should match the "error" schema
    And the error code should be "VALIDATION_ERROR"
    And the error should mention the "<param>" parameter

    Examples:
      | case                     | query                     | param     |
      | limit zero               | limit=0                   | limit     |
      | limit above max          | limit=51                  | limit     |
      | limit not a number       | limit=abc                 | limit     |
      | limit decimal            | limit=2.5                 | limit     |
      | page zero                | page=0                    | page      |
      | page negative            | page=-1                   | page      |
      | unsupported sort field   | sortBy=likes              | sortBy    |
      | unsupported order        | order=up                  | order     |
      | unknown genre            | genre=jazz                | genre     |
      | genre wrong case         | genre=Music               | genre     |
      | duplicated genre         | genre=music&genre=gaming  | genre     |
      | rating above 5           | minRating=6               | minRating |
      | rating below 0           | minRating=-1              | minRating |
      | rating not a number      | minRating=4.5abc          | minRating |
      | channelId zero           | channelId=0               | channelId |
      | search too short         | q=a                       | q         |
      | search only spaces       | q=%20%20%20               | q         |
      | unknown parameter        | foo=bar                   | foo       |
      | typo in parameter name   | gnere=music               | gnere     |
