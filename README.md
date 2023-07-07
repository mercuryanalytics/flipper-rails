# Flipper::Rails

Flipper is a JavaScript library to render a set of images as virtual magazine with animated page turning.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'flipper-rails', git: 'git://github.com/mercuryanalytics/flipper-rails.git'
```

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install flipper-rails

## Usage

Load the module via RequireJS and pass it a DOM node and a list of image files:

```javascript
require(['flipper'], function(flipper) {
  var images = [];
  for (var i = 0; i < 10; i++) {
    images.push("images/page" + i + ".png");
  }
  flipper.default(document.querySelector('#flipper'), images);
});
```

Each time the user turns the page, the "#flipper" node will fire a "flipbook:pagechange" event
with the current page and a flag indicating whether the current page is the last page.

```javascript
document.querySelector('#flipper').addEventListener("flipbook:pagechange", function(event) {
  console.log("page", event.detail.currentPage, "last?", event.detail.lastPage);
});
```

## Development

After checking out the repo, run `npm run serve` and connect to http://localhost:8000/ to view a sample flipbook.

To build the es5 javascript, run `npm run build`.

To install this gem onto your local machine, run `bundle exec rake install`. To release a new version, update the version number in `version.rb`, and then run `bundle exec rake release`, which will create a git tag for the version, push git commits and tags, and push the `.gem` file to [rubygems.org](https://rubygems.org).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/mercuryanalytics/flipper-rails.

