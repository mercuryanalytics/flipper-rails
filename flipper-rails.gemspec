# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'flipper/rails/version'

Gem::Specification.new do |spec|
  spec.name          = "flipper-rails"
  spec.version       = Flipper::Rails::VERSION
  spec.authors       = ["Scott Brickner"]
  spec.email         = ["scottb@brickner.net"]

  spec.summary       = %q{JavaScript flipbook}
  spec.description   = %q{Renders a set of images as a virtual magazine with animated page turning.}
  spec.homepage      = "https://github.com/mercuryanalytics/flipbook-rails"

  # Prevent pushing this gem to RubyGems.org by setting 'allowed_push_host', or
  # delete this section to allow pushing this gem to any host.
  if spec.respond_to?(:metadata)
    spec.metadata['allowed_push_host'] = "" #"TODO: Set to 'http://mygemserver.com'"
  else
    raise "RubyGems 2.0 or newer is required to protect against public gem pushes."
  end

  spec.files         = Dir["{lib,app}/**/*"] + ["README.md"]
  spec.bindir        = "exe"
  spec.require_paths = ["lib"]

  spec.add_dependency "railties"

  spec.add_development_dependency "bundler", "~> 1.10"
  spec.add_development_dependency "rake", "~> 10.0"
end
