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
        await page.goto("http://localhost:3009", wait_until="commit", timeout=10000)
        
        # -> Type 'react' into the package input field and click the Search button to run analysis.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/main/div[2]/div[3]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('react')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/main/div[2]/div[3]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        frame = context.pages[-1]
        
        # Assert 'Analyze' button is visible
        elem = frame.locator('xpath=/html/body/main/div[2]/div[1]/button[1]').nth(0)
        await elem.wait_for(state='visible', timeout=5000)
        assert await elem.is_visible()
        
        # Assert the package input contains 'react' and is visible
        elem = frame.locator('xpath=/html/body/main/div[2]/div[3]/div[1]/div/input').nth(0)
        await elem.wait_for(state='visible', timeout=5000)
        assert await elem.is_visible()
        assert await elem.input_value() == 'react'
        
        # Assert size visualization is visible
        elem = frame.locator('xpath=/html/body/main/div[2]/div[3]/div[2]/div[2]/div[2]').nth(0)
        await elem.wait_for(state='visible', timeout=5000)
        assert await elem.is_visible()
        
        # Assert stats element (download speed stat) is visible
        elem = frame.locator('xpath=/html/body/main/div[2]/div[3]/div[3]/div[3]/div[4]/div/div[1]/span[1]').nth(0)
        await elem.wait_for(state='visible', timeout=5000)
        assert await elem.is_visible()
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    