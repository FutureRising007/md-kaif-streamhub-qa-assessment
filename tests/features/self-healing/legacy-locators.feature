@self-healing
Feature: Legacy locators (broken on purpose)
  These scenarios use LegacyEmiCalculatorPage, whose locators are deliberately brittle and
  broken for the AI self-healing exercise. They are EXPECTED TO FAIL and are not part of
  `npm test`. Run them with `npm run test:self-healing`, then try `npm run heal`.

  Background:
    Given I open the EMI calculator with the legacy page object

  Scenario: Legacy - loan amount field (positional CSS)
    When I type "2500000" into the legacy "loan amount" field

  Scenario: Legacy - interest rate field (absolute XPath)
    When I type "10" into the legacy "interest rate" field

  Scenario: Legacy - loan tenure field (renamed id)
    When I type "10" into the legacy "loan tenure" field

  Scenario: Legacy - personal loan tab (stale link text)
    When I click the legacy personal loan tab

  Scenario: Legacy - pie chart (auto-generated id)
    Then the legacy pie chart should be visible
