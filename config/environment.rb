require 'dotenv/load'
require 'sinatra'

configure :production, :development do
  enable :logging
  set :show_exceptions, false
end 