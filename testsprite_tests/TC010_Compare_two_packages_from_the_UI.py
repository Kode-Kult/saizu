import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3009
        await page.goto("http://localhost:3009")
        
        # -> Click the 'Compare' tab to switch the UI into package comparison mode so the two package input fields appear.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div/button[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill 'react' into the first package input field (Package A).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div[2]/div[4]/div/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('react')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div[2]/div[4]/div/div[3]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('preact')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div[4]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the Compare button again to submit the comparison (attempt 2), then check whether a comparison results view appears and the metric differences for size and dependency counts are displayed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div[4]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'react') and contains(., 'preact')]").nth(0).is_visible(), "The comparison results view should show both package names after submitting the comparison.",
        assert await frame.locator("xpath=//*[contains(., 'Size') and contains(., 'Dependencies')]").nth(0).is_visible(), "The comparison results view should display Size and Dependencies metrics for the compared packages.",
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    