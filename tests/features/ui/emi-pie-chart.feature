@ui
Feature: EMI Calculator - Pie chart (Test Case 1)

  Scenario Outline: Home loan EMI and pie chart - Scenario <scenario>
    Given I open the EMI calculator
    When I select the "Home Loan" tab
    And I enter loan amount "<amount>", interest rate <rate>% and tenure <years> years
    Then the displayed EMI should match my calculated EMI
    And the pie chart should be visible
    And both pie chart sections should have values greater than zero

    Examples:
      | scenario | amount | rate | years |
      | A        | 25L    | 10   | 10    |
      | B        | 50L    | 7.5  | 15    |
