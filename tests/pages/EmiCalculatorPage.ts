import { expect, type Locator, type Page } from '@playwright/test';
import { parseRupees } from '../utils/amount';

export type LoanType = 'Home Loan' | 'Personal Loan' | 'Car Loan';
type SliderName = 'amount' | 'rate' | 'tenure';

// slider min/max/step on the Personal Loan tab (checked on the site, other tabs differ)
const personalLoanSliders: Record<SliderName, { min: number; max: number; step: number }> = {
  amount: { min: 0, max: 3000000, step: 10000 },
  rate: { min: 5, max: 25, step: 0.25 },
  tenure: { min: 0, max: 5, step: 0.25 },
};

export class EmiCalculatorPage {
  readonly page: Page;
  readonly loanAmount: Locator;
  readonly interestRate: Locator;
  readonly loanTenure: Locator;
  readonly emi: Locator;
  readonly totalInterest: Locator;
  readonly totalPayment: Locator;
  readonly pieChart: Locator;
  readonly barChart: Locator;
  readonly startMonth: Locator;
  readonly sliders: Record<SliderName, Locator>;

  constructor(page: Page) {
    this.page = page;
    // label text changes per tab - "Home Loan Amount", "Personal Loan Amount" etc
    this.loanAmount = page.getByLabel(/^(Home|Personal|Car) Loan Amount$/);
    this.interestRate = page.getByLabel('Interest Rate', { exact: true });
    this.loanTenure = page.getByLabel('Loan Tenure', { exact: true });

    this.emi = this.resultFor(/^Loan EMI$/);
    this.totalInterest = this.resultFor(/^Total Interest Payable$/);
    this.totalPayment = this.resultFor(/^Total Payment/); // heading has a <br> in it

    // highcharts containers have no accessible name, ids are the best option here
    this.pieChart = page.locator('#emipiechart');
    this.barChart = page.locator('#emibarchart');

    this.startMonth = page.getByLabel('Schedule showing EMI payments starting from');

    // jquery-ui slider handles have no role/label at all, so go via the slider id
    this.sliders = {
      amount: page.locator('#loanamountslider .ui-slider-handle'),
      rate: page.locator('#loaninterestslider .ui-slider-handle'),
      tenure: page.locator('#loantermslider .ui-slider-handle'),
    };
  }

  private resultFor(heading: RegExp) {
    return this.page.getByRole('heading', { name: heading }).locator('..').getByText(/₹/);
  }

  async open() {
    await this.page.goto('/');
    await expect(this.loanAmount).toBeVisible();
  }

  async selectLoanType(type: LoanType) {
    await this.page.getByRole('link', { name: type, exact: true }).click();
    await expect(this.page.getByLabel(`${type} Amount`, { exact: true })).toBeVisible();
  }

  async enterLoanDetails(amount: number, rate: number, years: number) {
    await this.typeValue(this.loanAmount, String(amount));
    await this.typeValue(this.interestRate, String(rate));
    await this.typeValue(this.loanTenure, String(years));
  }

  private async typeValue(input: Locator, value: string) {
    await input.fill(value);
    await input.press('Tab'); // site recalculates on blur
  }

  async getEmi() {
    return parseRupees(await this.emi.innerText());
  }

  async getTotalInterest() {
    return parseRupees(await this.totalInterest.innerText());
  }

  async getTotalPayment() {
    return parseRupees(await this.totalPayment.innerText());
  }

  // Drags the handle to roughly the right spot, then fixes it up with arrow keys.
  // Dragging alone can land one step off because of pixel rounding.
  async moveSlider(name: SliderName, target: number) {
    const { min, max, step } = personalLoanSliders[name];
    const handle = this.sliders[name];
    const input = { amount: this.loanAmount, rate: this.interestRate, tenure: this.loanTenure }[name];

    const track = await handle.locator('..').boundingBox();
    const box = await handle.boundingBox();
    if (!track || !box) throw new Error(`slider ${name} not visible`);

    const targetX = track.x + ((target - min) / (max - min)) * track.width;
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, box.y + box.height / 2, { steps: 10 });
    await this.page.mouse.up();

    for (let i = 0; i < 20; i++) {
      const current = parseRupees(await input.inputValue());
      const diff = Math.round((target - current) / step);
      if (diff === 0) return;
      await handle.press(diff > 0 ? 'ArrowRight' : 'ArrowLeft');
    }
    throw new Error(`couldn't get ${name} slider to ${target}, it's at ${await input.inputValue()}`);
  }

  // month picker (bootstrap-datepicker in "months" mode). month like "Mar", year like 2027
  async pickStartMonth(month: string, year: number) {
    await this.startMonth.click();
    const picker = this.page.locator('.datepicker-months');
    await expect(picker).toBeVisible();

    const yearLabel = picker.locator('.datepicker-switch');
    for (let i = 0; i < 10; i++) {
      const shown = Number(await yearLabel.innerText());
      if (shown === year) break;
      await picker.locator(shown < year ? '.next' : '.prev').click();
    }
    await expect(yearLabel).toHaveText(String(year));
    await picker.getByText(month, { exact: true }).click();
    await expect(this.startMonth).toHaveValue(`${month} ${year}`);
  }

  // year labels on the x axis, e.g. ["2027", "2028", ...]
  async getBarChartYears() {
    return this.barChart.locator('.highcharts-xaxis-labels text').allTextContents(); // svg has no innerText
  }

  // every column segment drawn in the chart (each year is principal + interest stacked).
  // scoped to .highcharts-series-group because the legend icons have the same classes
  // and were getting counted as bars (got 14 instead of 12 the first time)
  barSegments() {
    return this.barChart.locator('.highcharts-series-group .highcharts-column-series rect.highcharts-point');
  }

  // hover the bar of one series for a year and return the tooltip text
  async hoverBar(series: 'Principal' | 'Interest', year: number) {
    const years = await this.getBarChartYears();
    const idx = years.indexOf(String(year));
    if (idx === -1) throw new Error(`no bar for ${year}, chart has ${years.join(', ')}`);

    // no aria labels on the chart (site doesn't load the highcharts accessibility module),
    // so go by series order: 0 = Interest, 1 = Principal. The tooltip check below
    // confirms we actually hovered the right series.
    const group = this.barChart.locator(`.highcharts-series-group .highcharts-series-${series === 'Interest' ? 0 : 1}`);
    const bar = group.locator('rect.highcharts-point').nth(idx);
    const tooltip = this.barChart.locator('.highcharts-tooltip');

    // a tooltip left over from a previous hover can sit right on top of the bar we want
    // (that's what made this flaky), so move away and let it hide first
    await this.page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();

    // the Balance line has an invisible ~22px hover area on top of the bars, so hovering
    // the centre of a bar sometimes shows the Balance tooltip instead. Try a few spots.
    const box = await bar.boundingBox();
    if (!box) throw new Error(`bar for ${year} not visible`);
    for (const yFrac of [0.85, 0.15, 0.5]) {
      await bar.hover({ position: { x: box.width / 2, y: box.height * yFrac }, force: true });
      const text = (await tooltip.textContent()) ?? '';
      if (text.includes(`Year : ${year}`) && text.includes(`${series} :`)) break;
    }
    await expect(tooltip).toContainText(`Year : ${year}`);
    await expect(tooltip).toContainText(`${series} :`);
    // svg tooltip - lines are separate <tspan>s so textContent runs them together,
    // the step parses it with regexes
    return (await tooltip.textContent()) ?? '';
  }

  // reads slice values straight from the highcharts object behind the pie
  async getPieChartValues(): Promise<{ name: string; value: number }[]> {
    return this.pieChart.evaluate((el) => {
      const chart = (window as any).Highcharts.charts.find((c: any) => c?.renderTo === el);
      return chart.series[0].points.map((p: any) => ({ name: String(p.name), value: Number(p.y) }));
    });
  }
}
