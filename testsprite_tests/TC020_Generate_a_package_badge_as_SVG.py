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
        
        # -> Navigate to /badge?package=react&metric=gzip&style=flat and verify the response is an SVG containing a numeric metric value, then finish.
        await page.goto("http://localhost:3009/badge?package=react&metric=gzip&style=flat")
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//svg").nth(0).is_visible(), "The badge SVG should be visible because the badge endpoint should return an SVG for the requested metric and style.",
        assert any(c.isdigit() for c in (await frame.locator("xpath=//svg").nth(0).text_content() or "")), "The badge should display a numeric metric value for the gzip metric."]}
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    