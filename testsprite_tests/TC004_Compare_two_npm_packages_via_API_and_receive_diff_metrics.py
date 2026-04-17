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
        
        # -> Navigate to /api/v1/compare?left=package:react&right=package:preact and verify the response is JSON containing delta fields for core metrics (size deltas and dependency count deltas).
        await page.goto("http://localhost:3009/api/v1/compare?left=package:react&right=package:preact")
        
        # -> Request the compare endpoint using the expected 'a' and 'b' query parameters (a=package:react, b=package:preact) and verify the JSON response contains size deltas and dependency count deltas.
        await page.goto("http://localhost:3009/api/v1/compare?a=package:react&b=package:preact")
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        content = await frame.locator("xpath=//*[contains(., '{')]").nth(0).text_content()
        assert '"size_delta"' in content and '"dependency_count_delta"' in content, "The JSON comparison response should include size deltas and dependency count deltas for the compared packages."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    