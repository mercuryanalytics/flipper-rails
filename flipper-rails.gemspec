# -*- encoding: utf-8 -*-
# stub: flipper-rails 2.4.0 ruby lib

Gem::Specification.new do |s|
  s.name = "flipper-rails"
  s.version = "2.4.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0") if s.respond_to? :required_rubygems_version=
  s.metadata = { "allowed_push_host" => "" } if s.respond_to? :metadata=
  s.require_paths = ["lib"]
  s.authors = ["Scott Brickner"]
  s.bindir = "exe"
  s.date = "2020-09-20"
  s.description = "Renders a set of images as a virtual magazine with animated page turning."
  s.email = ["scottb@brickner.net"]
  s.files = ["README.md", "app/assets", "app/assets/javascripts", "app/assets/javascripts/flipper.js", "lib/flipper", "lib/flipper/rails", "lib/flipper/rails.rb", "lib/flipper/rails/version.rb"]
  s.homepage = "https://github.com/mercuryanalytics/flipbook-rails"
  s.rubygems_version = "2.4.5.2"
  s.summary = "JavaScript flipbook"

  s.installed_by_version = "2.4.5.2" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0')
      s.add_runtime_dependency(%q<railties>, [">= 0"])
      s.add_development_dependency(%q<bundler>, ["~> 1.10"])
      s.add_development_dependency(%q<rake>, ["~> 10.0"])
    else
      s.add_dependency(%q<railties>, [">= 0"])
      s.add_dependency(%q<bundler>, ["~> 1.10"])
      s.add_dependency(%q<rake>, ["~> 10.0"])
    end
  else
    s.add_dependency(%q<railties>, [">= 0"])
    s.add_dependency(%q<bundler>, ["~> 1.10"])
    s.add_dependency(%q<rake>, ["~> 10.0"])
  end
end
