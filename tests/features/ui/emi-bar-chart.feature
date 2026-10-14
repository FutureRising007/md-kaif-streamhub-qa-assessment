@ui
Feature: EMI Calculator - Bar chart (Test Case 2)

  Scenario: Personal loan via sliders - bar chart and tooltip
    Given I open the EMI calculator
    When I select the "Personal Loan" tab
    And I use the sliders to set loan amount "10L", interest rate 12% and tenure 5 years
    Then the displayed EMI should match my calculated EMI
    When I change the schedule start month to "Mar 2027"
    Then the bar chart should be visible
    And the bar chart should have one bar for each calendar year of the loan
    And the tooltip for the "Principal" bar of 2028 should match my payment schedule
    And the tooltip for the "Interest" bar of 2028 should match my payment schedule
