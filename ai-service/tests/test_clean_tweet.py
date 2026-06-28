import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from nlp_utils import clean_tweet


def test_strips_urls():
    assert clean_tweet("check http://foo.com") == "check"
    assert clean_tweet("see https://example.com/path cool") == "see cool"


def test_strips_mentions():
    assert clean_tweet("@user hello") == "hello"
    assert clean_tweet("hey @john_doe what up") == "hey what up"


def test_strips_hashtags():
    assert clean_tweet("#great flight") == "great flight"
    assert clean_tweet("#awesome #service") == "awesome service"


def test_demojizes_emoji():
    result = clean_tweet("hello \U0001f600 world")
    assert "grinning_face" in result or "smiling_face" in result
    assert result.endswith(" world")


def test_handles_non_string():
    assert clean_tweet(None) == ""
    assert clean_tweet(123) == ""


def test_lowercases():
    assert clean_tweet("HELLO World") == "hello world"


def test_collapses_whitespace():
    assert clean_tweet("too   many    spaces") == "too many spaces"
    assert clean_tweet("  leading and trailing  ") == "leading and trailing"


def test_combined_real_tweet():
    result = clean_tweet(
        "@VirginAmerica plus you've added commercials to the experience... "
        "tacky. http://t.co/xyz #badservice"
    )
    assert "commercials" in result
    assert "tacky" in result
    assert "http" not in result
    assert "#" not in result
    assert "@" not in result
    assert "badservice" in result
