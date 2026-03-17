import argparse
import os
import sys
import time

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def automate_login(email: str, password: str, headless: bool = False) -> None:
    """Open Higgsfield login page, type credentials with delay, and submit."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto("https://higgsfield.ai/auth/login", wait_until="domcontentloaded", timeout=60000)

            email_input = page.locator('input[name="email"]')
            password_input = page.locator('input[name="password"]')

            email_input.wait_for(state="visible", timeout=30000)

            # Type email with simulated delay
            email_input.click()
            email_input.fill("")
            email_input.type(email, delay=80)

            # Type password with simulated delay
            password_input.click()
            password_input.fill("")
            password_input.type(password, delay=80)

            # Click the submit button
            submit = page.locator('input[type="submit"][value="Log in"]')
            if submit.count() == 0:
                # Fallback: try role/button name
                submit = page.get_by_role("button", name="Log in")
            submit.first.click()

            # Wait for navigation/network to settle
            page.wait_for_load_state("networkidle", timeout=60000)
            time.sleep(2)
        except PlaywrightTimeoutError:
            print("Timed out while attempting to log in.", file=sys.stderr)
            raise
        finally:
            context.close()
            browser.close()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Automate login to higgsfield.ai with typing simulation")
    parser.add_argument(
        "--email",
        default=os.getenv("HIGGSFIELD_EMAIL", "admin@ecomefficiency.com"),
        help="Email to use for login (or set HIGGSFIELD_EMAIL)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("HIGGSFIELD_PASSWORD", "JHvtviciyz?75jhbe3!"),
        help="Password to use for login (or set HIGGSFIELD_PASSWORD)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode (no UI)",
    )
    return parser


if __name__ == "__main__":
    args = build_arg_parser().parse_args()
    automate_login(email=args.email, password=args.password, headless=args.headless)


